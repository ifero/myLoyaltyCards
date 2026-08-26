package com.iferoporefi.myloyaltycards.wear.usage

import androidx.room.Room
import com.iferoporefi.myloyaltycards.wear.data.WearDatabase
import com.iferoporefi.myloyaltycards.wear.sync.WearSyncTransport
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.job
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * The real `CARD_USED` recorder wired into the barcode screen (Story 10-6).
 *
 * This is the one production usage-recording path — `MainActivity` hands
 * [com.iferoporefi.myloyaltycards.wear.WearGraph.cardUsageRecorder] to `WearApp` — so its
 * central claim is worth pinning: `recordCardUsed` must run its enqueue on an
 * **application-lifetime** scope, not the caller's, because the caller is a Composable effect that
 * is cancelled the instant the user drops their wrist. If the enqueue rode the caller's scope, the
 * event would be lost precisely on the walk away from the till.
 */
@RunWith(RobolectricTestRunner::class)
class OutboxCardUsageRecorderTest {

    private lateinit var database: WearDatabase
    private lateinit var transport: RecordingTransport

    private class RecordingTransport : WearSyncTransport {
        val sent = java.util.Collections.synchronizedList(mutableListOf<String>())
        override suspend fun readSnapshot(): String? = null
        override fun snapshots(): Flow<String> = emptyFlow()
        override fun phoneReachable(): Flow<Boolean> = emptyFlow()
        override suspend fun sendMessage(json: String): Boolean {
            sent += json
            return true
        }
    }

    @Before
    fun setUp() {
        database = Room.inMemoryDatabaseBuilder(RuntimeEnvironment.getApplication(), WearDatabase::class.java).build()
        transport = RecordingTransport()
    }

    @After
    fun tearDown() {
        database.close()
    }

    private fun outbox() = UsageOutbox(database.usageOutboxDao(), transport)

    /** Await [predicate], failing rather than hanging if it never holds. */
    private suspend fun awaitUntil(message: String, predicate: suspend () -> Boolean) {
        withTimeout(5_000) {
            while (!predicate()) kotlinx.coroutines.delay(10)
        }
        assertTrue(message, predicate())
    }

    @Test
    fun `records a card open by enqueuing and flushing it`() = runBlocking {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        try {
            val out = outbox()
            OutboxCardUsageRecorder(out, scope).recordCardUsed("card-1", "2026-08-12T10:00:00.123Z")

            awaitUntil("event delivered to the transport") { transport.sent.isNotEmpty() }
            // Enqueued then flushed, so the queue is empty and the phone saw exactly the one event.
            awaitUntil("queue drained after flush") { out.pendingCount() == 0 }
            assertEquals(1, transport.sent.size)
        } finally {
            // AWAIT, do not just cancel. `cancel()` returns immediately, so a recorder coroutine
            // still inside a Room call would meet `database.close()` in @After — throwing inside a
            // SupervisorJob with no CoroutineExceptionHandler, which surfaces as
            // `UncaughtExceptionsBeforeTest` in an unrelated later test. See the note on
            // WearSyncCoordinatorTest.tearDown.
            scope.coroutineContext.job.cancelAndJoin()
        }
    }

    /**
     * The load-bearing guarantee. The recorder is given the application scope, not the caller's;
     * cancelling the *caller's* scope after the call must not stop the work. Modelled by cancelling
     * a separate caller scope while the injected application scope stays live.
     */
    @Test
    fun `the enqueue survives cancellation of the caller's scope`() = runBlocking {
        val appScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        val callerScope = CoroutineScope(Dispatchers.Default + Job())
        try {
            val out = outbox()
            val recorder = OutboxCardUsageRecorder(out, appScope)

            // The call originates from the caller's (composition-like) scope…
            val gate = CompletableDeferred<Unit>()
            callerScope.launch {
                recorder.recordCardUsed("card-1", "2026-08-12T10:00:00.123Z")
                gate.complete(Unit)
            }
            gate.await()
            // …and that scope is torn down immediately after, as a Composable effect would be.
            callerScope.cancel()

            // The work runs on appScope regardless, so the event still reaches the transport.
            awaitUntil("event survives caller-scope cancellation") { transport.sent.size == 1 }
        } finally {
            // The widest window in this suite: `awaitUntil` returns as soon as the TRANSPORT has
            // the event, but the outbox deletes the delivered row from Room *after* that. Await
            // both scopes so the database outlives that delete.
            appScope.coroutineContext.job.cancelAndJoin()
            callerScope.coroutineContext.job.cancelAndJoin()
        }
    }
}
