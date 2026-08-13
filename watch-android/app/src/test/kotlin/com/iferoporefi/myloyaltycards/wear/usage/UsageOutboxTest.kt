package com.iferoporefi.myloyaltycards.wear.usage

import androidx.room.Room
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import com.iferoporefi.myloyaltycards.wear.sync.WearSyncTransport
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * The durable `CARD_USED` outbox (Story 10-6, AC8/AC9/AC15).
 *
 * The story calls this "the highest-risk component and the least testable in a unit test", which
 * is exactly why [com.iferoporefi.myloyaltycards.wear.sync.WearSyncTransport] is an interface:
 * behind it, every delivery outcome — offline, partially offline, dying mid-flush — is a plain
 * JVM test. Room runs under Robolectric, so these are `testDebugUnitTest` cases that run in CI
 * with no emulator.
 */
@RunWith(RobolectricTestRunner::class)
class UsageOutboxTest {

    /**
     * A transport whose reachability is a switch and whose sends are recorded.
     *
     * `failAfter` lets a flush succeed for N messages and then start failing, which is what a
     * connection dropping mid-batch actually looks like.
     */
    private class FakeTransport(
        var online: Boolean = true,
        var failAfter: Int = Int.MAX_VALUE,
    ) : WearSyncTransport {
        val sent = mutableListOf<String>()

        override suspend fun readSnapshot(): String? = null
        override fun snapshots(): Flow<String> = emptyFlow()
        override fun phoneReachable(): Flow<Boolean> = emptyFlow()

        override suspend fun sendMessage(json: String): Boolean {
            if (!online || sent.size >= failAfter) return false
            sent += json
            return true
        }
    }

    private val context = RuntimeEnvironment.getApplication()
    private lateinit var database: WearDatabase
    private lateinit var transport: FakeTransport
    private lateinit var outbox: UsageOutbox

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(context, WearDatabase::class.java).build()
        transport = FakeTransport()
        outbox = UsageOutbox(database.usageOutboxDao(), transport)
    }

    @After
    fun tearDown() {
        database.close()
    }

    // --- AC9: never lost -----------------------------------------------------------------

    @Test
    fun `an event sent while online is delivered and removed from the queue`() = runTest {
        assertTrue(outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z"))

        assertEquals(1, outbox.flush())
        assertEquals(1, transport.sent.size)
        assertEquals(0, outbox.pendingCount())
    }

    @Test
    fun `an event enqueued while offline survives in the queue`() = runTest {
        transport.online = false
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")

        assertEquals(0, outbox.flush())
        assertEquals(0, transport.sent.size)
        assertEquals(1, outbox.pendingCount())
    }

    /** AC15 — the offline-then-reconnect scenario, end to end. */
    @Test
    fun `queued events flush when connectivity returns`() = runTest {
        transport.online = false
        outbox.enqueue("card-1", "2026-08-12T10:00:00.100Z")
        outbox.enqueue("card-2", "2026-08-12T10:00:00.200Z")
        outbox.enqueue("card-3", "2026-08-12T10:00:00.300Z")
        outbox.flush()
        assertEquals(3, outbox.pendingCount())

        transport.online = true

        assertEquals(3, outbox.flush())
        assertEquals(0, outbox.pendingCount())
    }

    /**
     * The story's specific ask: "prioritise a test that kills the process between enqueue and
     * flush". A file-backed database that is closed and reopened is exactly that — an in-memory
     * store cannot demonstrate durability by construction.
     */
    @Test
    fun `an event survives the process dying between enqueue and flush`() = runTest {
        val dbName = "outbox-durability-test.db"
        context.deleteDatabase(dbName)
        try {
            // Session 1: enqueue while offline, then "die" — the close() below stands in for the
            // watch app being killed the moment the user drops their wrist.
            val first = Room.databaseBuilder(context, WearDatabase::class.java, dbName).build()
            UsageOutbox(first.usageOutboxDao(), FakeTransport(online = false)).also {
                it.enqueue("card-1", "2026-08-12T10:00:00.123Z")
                it.flush()
            }
            first.close()

            // Session 2: a fresh process, a fresh transport, and the event is still owed.
            val second = Room.databaseBuilder(context, WearDatabase::class.java, dbName).build()
            val reopened = FakeTransport(online = true)
            val outboxAfterRestart = UsageOutbox(second.usageOutboxDao(), reopened)

            assertEquals(1, outboxAfterRestart.pendingCount())
            assertEquals(1, outboxAfterRestart.flush())
            assertEquals("card-1", JSONObject(reopened.sent.single()).getJSONObject("payload").getString("id"))
            second.close()
        } finally {
            context.deleteDatabase(dbName)
        }
    }

    /**
     * Deletion happens only after a confirmed send. A transport that fails part-way must leave
     * the undelivered remainder queued — the whole point of the outbox.
     */
    @Test
    fun `a send that fails part-way keeps the undelivered remainder`() = runTest {
        transport.failAfter = 2
        outbox.enqueue("card-1", "2026-08-12T10:00:00.100Z")
        outbox.enqueue("card-2", "2026-08-12T10:00:00.200Z")
        outbox.enqueue("card-3", "2026-08-12T10:00:00.300Z")

        assertEquals(2, outbox.flush())
        assertEquals(1, outbox.pendingCount())

        transport.failAfter = Int.MAX_VALUE
        assertEquals(1, outbox.flush())
        assertEquals(0, outbox.pendingCount())
    }

    // --- AC9: never duplicated ------------------------------------------------------------

    @Test
    fun `enqueueing the same card and timestamp twice queues one event`() = runTest {
        assertTrue(outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z"))
        assertFalse(outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z"))

        assertEquals(1, outbox.pendingCount())
        assertEquals(1, outbox.flush())
    }

    /** Two genuine opens a millisecond apart are two events — the reason ms precision matters. */
    @Test
    fun `two opens of the same card at different milliseconds are distinct events`() = runTest {
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")
        outbox.enqueue("card-1", "2026-08-12T10:00:00.124Z")

        assertEquals(2, outbox.pendingCount())
    }

    @Test
    fun `a flushed event is not re-sent on the next flush`() = runTest {
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")
        outbox.flush()
        outbox.flush()

        assertEquals(1, transport.sent.size)
    }

    // --- Ordering ---------------------------------------------------------------------------

    @Test
    fun `events are sent oldest first`() = runTest {
        outbox.enqueue("card-c", "2026-08-12T10:00:00.300Z")
        outbox.enqueue("card-a", "2026-08-12T10:00:00.100Z")
        outbox.enqueue("card-b", "2026-08-12T10:00:00.200Z")

        outbox.flush()

        val ids = transport.sent.map { JSONObject(it).getJSONObject("payload").getString("id") }
        assertEquals(listOf("card-a", "card-b", "card-c"), ids)
    }

    // --- AC8: no card data may ever leave the watch -----------------------------------------

    /**
     * Asserted against the encoded bytes, not against the reading of the code. The envelope must
     * contain exactly `version`, `type` and `payload{id, usedAt}` — a change that started
     * attaching a card's name or barcode would fail here.
     */
    @Test
    fun `the emitted envelope contains only the version, the type and id plus usedAt`() = runTest {
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")
        outbox.flush()

        val envelope = JSONObject(transport.sent.single())
        assertEquals(setOf("version", "type", "payload"), envelope.keys().asSequence().toSet())
        assertEquals(1, envelope.getInt("version"))
        assertEquals("CARD_USED", envelope.getString("type"))

        val payload = envelope.getJSONObject("payload")
        assertEquals(setOf("id", "usedAt"), payload.keys().asSequence().toSet())
        assertEquals("card-1", payload.getString("id"))
        assertEquals("2026-08-12T10:00:00.123Z", payload.getString("usedAt"))
    }

    /**
     * The invariant stated negatively, against a card whose every field is a distinctive marker.
     * The outbox is only ever handed an id and a timestamp, so there is no path by which card
     * content could reach the wire — this proves the API shape enforces that.
     */
    @Test
    fun `no card content can reach the wire`() = runTest {
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")
        outbox.flush()

        val wire = transport.sent.single()
        for (forbidden in listOf("name", "barcode", "brandId", "colorHex", "isFavorite", "usageCount")) {
            assertFalse("`$forbidden` must never leave the watch", wire.contains(forbidden))
        }
    }

    /**
     * `CARD_USED` is the ONLY type the watch emits (ADR-2026-06-09-001). The outbox has no other
     * encode path, so every message it can ever produce carries this type.
     */
    @Test
    fun `every emitted message is a CARD_USED event`() = runTest {
        outbox.enqueue("card-1", "2026-08-12T10:00:00.100Z")
        outbox.enqueue("card-2", "2026-08-12T10:00:00.200Z")
        outbox.flush()

        assertTrue(transport.sent.all { JSONObject(it).getString("type") == "CARD_USED" })
    }

    // --- Batching -----------------------------------------------------------------------------

    @Test
    fun `a backlog larger than one batch is drained completely`() = runTest {
        val total = UsageOutbox.BATCH_SIZE * 2 + 3
        repeat(total) { index ->
            outbox.enqueue("card-$index", "2026-08-12T10:00:%02d.000Z".format(index % 60) )
        }
        val queued = outbox.pendingCount()

        assertEquals(queued, outbox.flush())
        assertEquals(0, outbox.pendingCount())
    }

    @Test
    fun `flushing an empty outbox is a harmless no-op`() = runTest {
        assertEquals(0, outbox.flush())
        assertEquals(0, transport.sent.size)
    }

    // --- Concurrency: the reason flushLock exists ------------------------------------------------

    /**
     * The `flushLock` docstring's claim, made a test: start-up, a capability change and a fresh
     * card open can all trigger a flush within the same instant, and without the mutex two flushes
     * could read the same batch and send every event twice. Here one flush is gated mid-send while
     * a second is launched concurrently; the mutex must serialise them so each event is sent
     * exactly once.
     *
     * Uses `runBlocking` with real dispatchers rather than `runTest` — the gate is a genuine
     * cross-thread hand-off (a `CompletableDeferred` released from the test thread while a flush
     * suspends on it), which virtual time cannot model.
     */
    @Test
    fun `two concurrent flushes never send an event twice`() = runBlocking {
        val gate = CompletableDeferred<Unit>()
        val firstSendReached = CompletableDeferred<Unit>()
        val sent = java.util.Collections.synchronizedList(mutableListOf<String>())

        val gatedTransport = object : WearSyncTransport {
            override suspend fun readSnapshot(): String? = null
            override fun snapshots(): Flow<String> = emptyFlow()
            override fun phoneReachable(): Flow<Boolean> = emptyFlow()
            override suspend fun sendMessage(json: String): Boolean {
                // Hold the very first send open until the test releases the gate, so a second
                // flush has every opportunity to interleave if the lock did not exist.
                if (!firstSendReached.isCompleted) {
                    firstSendReached.complete(Unit)
                    gate.await()
                }
                sent += json
                return true
            }
        }
        val racyOutbox = UsageOutbox(database.usageOutboxDao(), gatedTransport)
        racyOutbox.enqueue("card-1", "2026-08-12T10:00:00.100Z")
        racyOutbox.enqueue("card-2", "2026-08-12T10:00:00.200Z")

        val flushA = launch(Dispatchers.Default) { racyOutbox.flush() }
        firstSendReached.await() // A is now suspended mid-send, holding the lock.
        val flushB = launch(Dispatchers.Default) { racyOutbox.flush() }

        gate.complete(Unit)
        flushA.join()
        flushB.join()

        // Each event exactly once — no duplicate from the second, racing flush.
        assertEquals(listOf("card-1", "card-2"), sent.map {
            JSONObject(it).getJSONObject("payload").getString("id")
        })
        assertEquals(0, racyOutbox.pendingCount())
    }
}
