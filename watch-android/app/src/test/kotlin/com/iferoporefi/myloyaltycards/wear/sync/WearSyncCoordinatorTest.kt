package com.iferoporefi.myloyaltycards.wear.sync

import androidx.room.Room
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import com.iferoporefi.myloyaltycards.wear.usage.UsageOutbox
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.job
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * The sync orchestration (Story 10-6, AC3/AC4/AC5/AC15).
 *
 * Each acceptance criterion here is a *trigger*, so every test drives the transport's flows and
 * asserts what the coordinator did in response.
 *
 * These use `runBlocking` with **real** dispatchers rather than `runTest`'s virtual time, matching
 * the house pattern `CardDaoTest` established. The reason is Room: its suspend DAOs and
 * `withTransaction` hop onto Room's own executor, a real thread pool the test scheduler does not
 * control, so `advanceUntilIdle()` returns while the write is still in flight and assertions race
 * it. Waiting on the observable outcome with a timeout is both honest about the concurrency and
 * stable.
 */
@RunWith(RobolectricTestRunner::class)
class WearSyncCoordinatorTest {

    /** A transport whose every input is under the test's control. */
    private class FakeTransport(var storedSnapshot: String? = null) : WearSyncTransport {
        val liveSnapshots = MutableSharedFlow<String>(extraBufferCapacity = 8)
        val reachability = MutableStateFlow(false)
        val sentMessages = java.util.Collections.synchronizedList(mutableListOf<String>())

        @Volatile
        var readSnapshotCalls = 0

        @Volatile
        var online = true

        /** When set, `readSnapshot` waits on it — lets a test pin the start-up/live ordering. */
        @Volatile
        var readGate: CompletableDeferred<Unit>? = null

        override suspend fun readSnapshot(): String? {
            readGate?.await()
            readSnapshotCalls += 1
            return storedSnapshot
        }

        override fun snapshots(): Flow<String> = liveSnapshots
        override fun phoneReachable(): Flow<Boolean> = reachability

        override suspend fun sendMessage(json: String): Boolean {
            if (!online) return false
            sentMessages += json
            return true
        }
    }

    private val context = RuntimeEnvironment.getApplication()
    private lateinit var database: WearDatabase
    private lateinit var transport: FakeTransport

    /** Stands in for `WearGraph.applicationScope`; cancelled after every test. */
    private lateinit var syncScope: CoroutineScope

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(context, WearDatabase::class.java).build()
        transport = FakeTransport()
        syncScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    }

    /**
     * Await the coordinator's coroutines before closing the database — do not just cancel.
     *
     * `CoroutineScope.cancel()` only *signals* cancellation and returns immediately. A coroutine
     * that is already inside a non-suspending Room call keeps running, and `database.close()`
     * lands underneath it: the Room call then throws `IllegalStateException` inside a
     * `SupervisorJob` carrying **no** `CoroutineExceptionHandler`, so it is routed to the JVM's
     * global uncaught-exception handler. `kotlinx-coroutines-test` installs a collector there,
     * and the next `runTest` to start in the same JVM fails with `UncaughtExceptionsBeforeTest`
     * — in a DIFFERENT test class, which did nothing wrong. CI caught exactly that once
     * (`UsageOutboxTest > a backlog larger than one batch is drained completely`), and the
     * window is narrow enough that it passes locally every time.
     *
     * `cancelAndJoin` closes the window: the database outlives every coroutine that can touch it.
     */
    @After
    fun tearDown() {
        runBlocking { syncScope.coroutineContext.job.cancelAndJoin() }
        database.close()
    }

    private fun startCoordinator(
        outbox: UsageOutbox = UsageOutbox(database.usageOutboxDao(), transport),
        transportOverride: WearSyncTransport = transport,
        flushRetryDelaysMs: List<Long> = FAST_RETRIES,
    ) {
        WearSyncCoordinator(
            transport = transportOverride,
            applier = SnapshotApplier(database),
            outbox = outbox,
            scope = syncScope,
            flushRetryDelaysMs = flushRetryDelaysMs,
        ).start()
    }

    private fun snapshot(vararg ids: String): String {
        val payload = ids.fold(JSONArray()) { acc, id ->
            acc.put(
                JSONObject()
                    .put("id", id)
                    .put("name", "Card $id")
                    .put("colorHex", "#1A73E8")
                    .put("barcodeValue", "barcode-$id")
                    .put("barcodeFormat", "EAN13")
                    .put("createdAt", "2026-01-10T09:00:00.000Z"),
            )
        }
        return JSONObject().put("version", 1).put("type", "cards").put("payload", payload).toString()
    }

    private suspend fun storedIds(): List<String> =
        database.cardDao().observeAll().first().map { it.id }.sorted()

    private fun sentTypes(): List<String> =
        transport.sentMessages.toList().map { JSONObject(it).getString("type") }

    /** Poll [predicate] until it holds, failing with [message] if it never does. */
    private suspend fun awaitUntil(message: String, predicate: suspend () -> Boolean) {
        try {
            withTimeout(TIMEOUT_MS) {
                while (!predicate()) delay(POLL_MS)
            }
        } catch (_: TimeoutCancellationException) {
            fail("timed out waiting for: $message")
        }
    }

    /**
     * `liveSnapshots` has no replay, so emitting before the coordinator has subscribed drops the
     * value on the floor and the test fails for a reason that has nothing to do with the code.
     */
    private suspend fun awaitSnapshotSubscription() =
        awaitUntil("coordinator to subscribe to snapshots") {
            transport.liveSnapshots.subscriptionCount.value > 0
        }

    // --- AC4: the start-up read is mandatory ------------------------------------------------

    /**
     * The single most likely thing to be missed in this story, per its own Dev Notes. A DataItem
     * written while the watch app was not running is never re-delivered as a change event, so
     * without this read a freshly installed watch shows an empty list until the phone happens to
     * publish again.
     */
    @Test
    fun `reads the stored snapshot on start, without waiting for a change event`() = runBlocking {
        transport.storedSnapshot = snapshot("a", "b")

        startCoordinator()

        awaitUntil("start-up read to apply the stored snapshot") { storedIds() == listOf("a", "b") }
        assertEquals(1, transport.readSnapshotCalls)
    }

    @Test
    fun `start-up with no stored snapshot leaves the store empty and does not crash`() = runBlocking {
        transport.storedSnapshot = null

        startCoordinator()

        awaitUntil("start-up read to be attempted") { transport.readSnapshotCalls == 1 }
        assertEquals(emptyList<String>(), storedIds())
    }

    @Test
    fun `a malformed stored snapshot is rejected without wiping the store`() = runBlocking {
        transport.storedSnapshot = "{{{ not json"

        startCoordinator()

        awaitUntil("start-up read to be attempted") { transport.readSnapshotCalls == 1 }
        assertEquals(emptyList<String>(), storedIds())
    }

    // --- AC3: live snapshots -----------------------------------------------------------------

    @Test
    fun `applies a snapshot that arrives while the app is running`() = runBlocking {
        startCoordinator()
        awaitSnapshotSubscription()

        transport.liveSnapshots.emit(snapshot("x", "y"))

        awaitUntil("live snapshot to be applied") { storedIds() == listOf("x", "y") }
    }

    /** AC7 — a card deleted on the phone disappears from the watch. */
    @Test
    fun `a deletion arriving live propagates to the watch`() = runBlocking {
        transport.storedSnapshot = snapshot("a", "b")
        startCoordinator()
        awaitUntil("initial snapshot") { storedIds() == listOf("a", "b") }
        awaitSnapshotSubscription()

        transport.liveSnapshots.emit(snapshot("a"))

        awaitUntil("deletion to propagate") { storedIds() == listOf("a") }
    }

    /**
     * The ordering hazard the coordinator's `appliedLiveSnapshot` flag exists for: the start-up
     * read and the listener run concurrently, so a slow read can resolve AFTER a live event. Since
     * every apply is a full replace, letting the stale read land last would roll the watch back to
     * a list the phone has already superseded.
     *
     * Made deterministic with `readGate`: the start-up read is held until the live snapshot has
     * demonstrably been applied, then released with a *different* (stale) payload.
     */
    @Test
    fun `a slow start-up read never overwrites a newer live snapshot`() = runBlocking {
        val gate = CompletableDeferred<Unit>()
        transport.readGate = gate
        transport.storedSnapshot = snapshot("stale")

        startCoordinator()
        awaitSnapshotSubscription()

        transport.liveSnapshots.emit(snapshot("fresh"))
        awaitUntil("live snapshot to be applied first") { storedIds() == listOf("fresh") }

        gate.complete(Unit)
        awaitUntil("start-up read to complete") { transport.readSnapshotCalls == 1 }
        // Give the (correctly suppressed) apply every chance to misbehave before asserting.
        delay(POLL_MS * 5)

        assertEquals(listOf("fresh"), storedIds())
    }

    // --- AC5: the requestCards ping ------------------------------------------------------------

    @Test
    fun `sends requestCards when the phone becomes reachable`() = runBlocking {
        startCoordinator()
        awaitSnapshotSubscription()
        assertTrue("nothing sent while unreachable", transport.sentMessages.isEmpty())

        transport.reachability.value = true

        awaitUntil("requestCards ping") { sentTypes() == listOf("requestCards") }
    }

    @Test
    fun `the requestCards message carries the versioned envelope`() = runBlocking {
        startCoordinator()
        transport.reachability.value = true
        awaitUntil("requestCards ping") { transport.sentMessages.isNotEmpty() }

        val message = JSONObject(transport.sentMessages.first())
        assertEquals(1, message.getInt("version"))
        assertEquals("requestCards", message.getString("type"))
    }

    @Test
    fun `does not ping again when the phone becomes unreachable`() = runBlocking {
        startCoordinator()
        transport.reachability.value = true
        awaitUntil("first ping") { sentTypes() == listOf("requestCards") }

        transport.reachability.value = false
        delay(POLL_MS * 5)

        assertEquals(listOf("requestCards"), sentTypes())
    }

    // --- AC15: the outbox flushes on reconnection ------------------------------------------------

    @Test
    fun `flushes queued usage events when the phone becomes reachable`() = runBlocking {
        transport.online = false
        val outbox = UsageOutbox(database.usageOutboxDao(), transport)
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")
        outbox.enqueue("card-2", "2026-08-12T10:00:00.456Z")

        startCoordinator(outbox = outbox)
        awaitSnapshotSubscription()
        assertEquals(2, outbox.pendingCount())

        transport.online = true
        transport.reachability.value = true

        awaitUntil("outbox to drain") { outbox.pendingCount() == 0 }
        // The ping, then both usage events.
        assertEquals(listOf("requestCards", "CARD_USED", "CARD_USED"), sentTypes())
    }

    /** Events that could not be sent stay queued; nothing is dropped when the phone is absent. */
    @Test
    fun `events stay queued when the phone is reachable but sends fail`() = runBlocking {
        transport.online = false
        val outbox = UsageOutbox(database.usageOutboxDao(), transport)
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")

        // No retries here, so the flush is a single failed attempt and the test does not race it.
        startCoordinator(outbox = outbox, flushRetryDelaysMs = emptyList())
        awaitSnapshotSubscription()

        transport.reachability.value = true
        delay(POLL_MS * 20)

        assertEquals("still queued while sends fail", 1, outbox.pendingCount())
    }

    /**
     * A reachability *transition* is not the same as "a send will succeed": the capability can
     * report the phone as present while an individual send fails on a momentary radio drop. The
     * retry is what stops the queue from sitting there until the next card open.
     */
    @Test
    fun `a flush that fails once is retried and succeeds without another reconnection`() = runBlocking {
        transport.online = false
        val outbox = UsageOutbox(database.usageOutboxDao(), transport)
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")

        startCoordinator(outbox = outbox)
        awaitSnapshotSubscription()
        transport.reachability.value = true

        // The radio comes back mid-backoff — no new reachability edge, so only the retry can
        // deliver this.
        transport.online = true

        awaitUntil("the retry to drain the outbox") { outbox.pendingCount() == 0 }
    }

    /** A later reconnection still flushes whatever the retries could not. */
    @Test
    fun `a reconnection after the retries are exhausted still drains the outbox`() = runBlocking {
        transport.online = false
        val outbox = UsageOutbox(database.usageOutboxDao(), transport)
        outbox.enqueue("card-1", "2026-08-12T10:00:00.123Z")

        startCoordinator(outbox = outbox, flushRetryDelaysMs = emptyList())
        awaitSnapshotSubscription()
        transport.reachability.value = true
        delay(POLL_MS * 5)
        assertEquals(1, outbox.pendingCount())

        transport.online = true
        // `MutableStateFlow` conflates, so the collector must be given a chance to observe
        // `false` before `true` counts as a new value again. A real Bluetooth drop lasts seconds,
        // so this pause models reality rather than papering over a race.
        transport.reachability.value = false
        delay(POLL_MS * 10)
        transport.reachability.value = true

        awaitUntil("outbox to drain on the second reconnection") { outbox.pendingCount() == 0 }
    }

    private companion object {
        const val TIMEOUT_MS = 5_000L
        const val POLL_MS = 10L

        /** Production waits 1s then 2s; tests must not. */
        val FAST_RETRIES = listOf(10L, 20L)
    }
}
