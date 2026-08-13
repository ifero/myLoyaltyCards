package expo.modules.weardatalayer

import android.content.Context
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
 * The phone-side durable inbox (Story 10-6, AC9).
 *
 * This is the component the Completion Notes call load-bearing: the watch deletes a `CARD_USED`
 * event once `sendMessage` succeeds, so if the phone's RN host is dead when the listener service
 * receives it, this store is the only thing standing between "delivered" and "lost". Its watch-side
 * analogue (`UsageOutbox`) has thorough Robolectric coverage; a code-review pass found a real bug
 * here (`acknowledge` could not remove a blank-id row) — so it earns the same.
 *
 * Robolectric supplies a JVM `Context` with real `SharedPreferences` and real `org.json` (the
 * `android.jar` stubs throw). These run via `./gradlew :wear-data-layer:testDebugUnitTest` from the
 * prebuild-generated `android/`.
 */
@RunWith(RobolectricTestRunner::class)
class WearDataLayerInboxTest {

    private lateinit var context: Context

    @Before
    fun setUp() {
        context = RuntimeEnvironment.getApplication()
        WearDataLayerInbox.clear(context)
    }

    @After
    fun tearDown() {
        WearDataLayerInbox.clear(context)
    }

    private fun ids() = WearDataLayerInbox.read(context).map { it.id }

    // --- Round trip -----------------------------------------------------------------------------

    @Test
    fun `append then read returns the message with a stable id and its data`() {
        WearDataLayerInbox.append(context, "/myloyaltycards/msg", "body-1")

        val entries = WearDataLayerInbox.read(context)
        assertEquals(1, entries.size)
        assertEquals("/myloyaltycards/msg", entries.single().path)
        assertEquals("body-1", entries.single().data)
        assertTrue("id is assigned", entries.single().id.isNotEmpty())
    }

    @Test
    fun `read is non-destructive — the same batch is returned until acknowledged`() {
        WearDataLayerInbox.append(context, "/p", "a")

        val first = WearDataLayerInbox.read(context)
        val second = WearDataLayerInbox.read(context)
        assertEquals(first.map { it.id }, second.map { it.id })
    }

    @Test
    fun `messages are returned oldest-first with distinct ids`() {
        WearDataLayerInbox.append(context, "/p", "a")
        WearDataLayerInbox.append(context, "/p", "b")
        WearDataLayerInbox.append(context, "/p", "c")

        val entries = WearDataLayerInbox.read(context)
        assertEquals(listOf("a", "b", "c"), entries.map { it.data })
        assertEquals(3, entries.map { it.id }.toSet().size) // all distinct
    }

    @Test
    fun `acknowledge removes only the named entries and returns the count`() {
        WearDataLayerInbox.append(context, "/p", "a")
        WearDataLayerInbox.append(context, "/p", "b")
        WearDataLayerInbox.append(context, "/p", "c")
        val entries = WearDataLayerInbox.read(context)
        val bId = entries.first { it.data == "b" }.id

        assertEquals(1, WearDataLayerInbox.acknowledge(context, listOf(bId)))
        assertEquals(listOf("a", "c"), WearDataLayerInbox.read(context).map { it.data })
    }

    @Test
    fun `acknowledging an unknown id removes nothing`() {
        WearDataLayerInbox.append(context, "/p", "a")
        assertEquals(0, WearDataLayerInbox.acknowledge(context, listOf("does-not-exist")))
        assertEquals(1, WearDataLayerInbox.read(context).size)
    }

    @Test
    fun `acknowledging an empty collection is a no-op`() {
        WearDataLayerInbox.append(context, "/p", "a")
        assertEquals(0, WearDataLayerInbox.acknowledge(context, emptyList()))
        assertEquals(1, WearDataLayerInbox.read(context).size)
    }

    // --- Durability -----------------------------------------------------------------------------

    @Test
    fun `ids keep incrementing across acknowledgements, so a reused slot cannot collide`() {
        WearDataLayerInbox.append(context, "/p", "a")
        val firstId = WearDataLayerInbox.read(context).single().id
        WearDataLayerInbox.acknowledge(context, listOf(firstId))

        WearDataLayerInbox.append(context, "/p", "b")
        val secondId = WearDataLayerInbox.read(context).single().id

        assertFalse("a fresh append must not reuse a retired id", firstId == secondId)
    }

    // --- The 500-entry FIFO trim ----------------------------------------------------------------

    @Test
    fun `the store is capped, dropping the oldest entries first`() {
        val overflow = WearDataLayerInbox.MAX_ENTRIES + 50
        repeat(overflow) { WearDataLayerInbox.append(context, "/p", "msg-$it") }

        val entries = WearDataLayerInbox.read(context)
        assertEquals(WearDataLayerInbox.MAX_ENTRIES, entries.size)
        // The newest events matter most for lastUsedAt; the oldest 50 are the ones dropped.
        assertEquals("msg-50", entries.first().data)
        assertEquals("msg-${overflow - 1}", entries.last().data)
    }

    @Test
    fun `append reports the retained count so a caller can see the cap engage`() {
        repeat(WearDataLayerInbox.MAX_ENTRIES) { WearDataLayerInbox.append(context, "/p", "x") }
        // One more: still capped at MAX_ENTRIES, never MAX+1.
        assertEquals(WearDataLayerInbox.MAX_ENTRIES, WearDataLayerInbox.append(context, "/p", "y"))
    }

    // --- Corruption recovery --------------------------------------------------------------------

    @Test
    fun `a corrupted store recovers to empty instead of throwing forever`() {
        // Simulate an externally-mangled preferences file.
        context
            .getSharedPreferences("expo.modules.weardatalayer.inbox", Context.MODE_PRIVATE)
            .edit()
            .putString("messages", "{{{ not a json array")
            .commit()

        // read() tolerates it…
        assertEquals(emptyList<String>(), ids())
        // …and a subsequent append starts a fresh, valid store rather than compounding the error.
        WearDataLayerInbox.append(context, "/p", "recovered")
        assertEquals(listOf("recovered"), WearDataLayerInbox.read(context).map { it.data })
    }

    // --- The blank-id regression (found and fixed in code review) -------------------------------

    /**
     * A structurally-valid row with a blank id is invisible to `read` (it filters it out), so no
     * consumer can ever name it in an acknowledgement. Before the fix it would then linger until
     * the MAX_ENTRIES trim happened to evict it. `acknowledge` now drops such rows on any call, so
     * a corrupt entry cannot wedge the queue. `append` never writes one, so this is reached only
     * via external corruption — which is exactly why it must be handled.
     */
    @Test
    fun `a blank-id row is dropped by acknowledge rather than lingering`() {
        // Hand-craft a store with one blank-id row and one good row.
        context
            .getSharedPreferences("expo.modules.weardatalayer.inbox", Context.MODE_PRIVATE)
            .edit()
            .putString(
                "messages",
                """[{"id":"","path":"/p","data":"orphan"},{"id":"5","path":"/p","data":"good"}]""",
            )
            .putLong("nextId", 6)
            .commit()

        // read() surfaces only the good row.
        assertEquals(listOf("good"), WearDataLayerInbox.read(context).map { it.data })

        // Acknowledging the good row also sweeps the unreachable blank-id row: the store is empty.
        assertEquals(2, WearDataLayerInbox.acknowledge(context, listOf("5")))
        assertEquals(emptyList<String>(), WearDataLayerInbox.read(context).map { it.data })
    }

    @Test
    fun `a row that is not a JSON object is skipped by read and swept by acknowledge`() {
        context
            .getSharedPreferences("expo.modules.weardatalayer.inbox", Context.MODE_PRIVATE)
            .edit()
            .putString("messages", """["not-an-object",{"id":"1","path":"/p","data":"good"}]""")
            .putLong("nextId", 2)
            .commit()

        assertEquals(listOf("good"), WearDataLayerInbox.read(context).map { it.data })
        // The non-object row is removed even though it was never acknowledged by id.
        assertEquals(2, WearDataLayerInbox.acknowledge(context, listOf("1")))
        assertEquals(0, WearDataLayerInbox.read(context).size)
    }

    // --- Concurrency ----------------------------------------------------------------------------

    /**
     * The class documents "all mutations hold [lock] so the read-modify-write of the JSON array is
     * atomic within the process." This is the higher-stakes concurrency claim in the module: it is a
     * hand-rolled `SharedPreferences`-backed JSON blob with no SQL-level atomicity to fall back on,
     * and `WearableListenerService.onMessageReceived` can be dispatched from more than one thread for
     * closely-spaced watch messages. Without the lock, two racing `append`s read the same array,
     * each adds its own entry, and the later write clobbers the earlier — a silently lost `CARD_USED`.
     *
     * This launches many threads appending at once and asserts every entry survives. It would fail
     * if the lock were ever narrowed or dropped (the analogue of `UsageOutboxTest`'s flush-race test).
     */
    @Test
    fun `concurrent appends do not lose entries`() {
        val threads = 8
        val perThread = 25
        val start = java.util.concurrent.CountDownLatch(1)
        val done = java.util.concurrent.CountDownLatch(threads)

        repeat(threads) { t ->
            Thread {
                start.await() // release all threads at once to maximise contention
                repeat(perThread) { i -> WearDataLayerInbox.append(context, "/p", "t$t-i$i") }
                done.countDown()
            }.start()
        }

        start.countDown()
        assertTrue("threads finished", done.await(10, java.util.concurrent.TimeUnit.SECONDS))

        val entries = WearDataLayerInbox.read(context)
        assertEquals(threads * perThread, entries.size)
        // Every (thread, index) pair is present exactly once — nothing clobbered, nothing duplicated.
        assertEquals(threads * perThread, entries.map { it.data }.toSet().size)
        // Ids are unique too, so a later acknowledge can address each one.
        assertEquals(threads * perThread, entries.map { it.id }.toSet().size)
    }
}
