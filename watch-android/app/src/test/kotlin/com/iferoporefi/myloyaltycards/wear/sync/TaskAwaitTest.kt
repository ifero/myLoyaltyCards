package com.iferoporefi.myloyaltycards.wear.sync

import com.google.android.gms.tasks.TaskCompletionSource
import com.google.android.gms.tasks.Tasks
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The Play services `Task` adapter (Story 10-6).
 *
 * These are the tests behind a code-review finding rather than an acceptance criterion, and the
 * finding was a good one. Every Wearable API call on the watch goes through this one extension,
 * and it originally had **no** timeout. `UsageOutbox.flush()` runs inside a `Mutex.withLock`, and
 * a Kotlin mutex is released when the critical section *completes* — so a single `sendMessage`
 * that never settled would have held the outbox lock for the remaining life of the process,
 * deadlocking every later card open and every later reconnection. `runCatching` cannot catch a
 * coroutine that simply never resumes. Story 16-10 is the phone-side precedent for the same
 * shape of bug.
 */
class TaskAwaitTest {

    @Test
    fun `resolves with the task result`() = runBlocking {
        assertEquals("done", Tasks.forResult("done").await())
    }

    @Test
    fun `a Void task resolves to null rather than throwing`() = runBlocking {
        assertNull(Tasks.forResult<Void>(null).await())
    }

    @Test
    fun `propagates the task failure`() {
        val failure = IllegalStateException("play services unavailable")
        val thrown = assertThrows(IllegalStateException::class.java) {
            runBlocking { Tasks.forException<String>(failure).await() }
        }
        assertEquals("play services unavailable", thrown.message)
    }

    /** The core guarantee: a task that never settles must not suspend forever. */
    @Test
    fun `a task that never completes times out instead of hanging`() {
        val never = TaskCompletionSource<String>().task

        assertThrows(TimeoutCancellationException::class.java) {
            runBlocking { never.await(timeoutMs = 50) }
        }
    }

    /**
     * Resumption must happen on the completing thread, NOT be posted to the main looper.
     *
     * The default `addOnCompleteListener(listener)` overload posts to the main looper — which is
     * why three of these tests originally hung for the full 10s (a plain JUnit test has no looper
     * pumping, so the callback never fired) and why, in production, every Data Layer call was
     * taking a needless hop onto the UI thread. The fix passes a direct executor. If that
     * regresses, `resolvedOnThread` would come back as the main thread's name (or the await would
     * hang), and this fails.
     */
    @Test
    fun `resumes on the completing thread, not the main looper`() = runBlocking {
        val source = TaskCompletionSource<String>()
        var resolvedOnThread: String? = null

        // Complete the task from a known background thread.
        val completer = Thread({ source.setResult("done") }, "completer-thread")

        val result = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
            completer.start()
            source.task.await().also { resolvedOnThread = Thread.currentThread().name }
        }

        assertEquals("done", result)
        // The continuation resumed on a background dispatcher thread, never on "main".
        assertFalse("resumed on the main looper", resolvedOnThread == "main")
    }

    /**
     * The failure this exists to prevent, reproduced end to end: a hanging call inside a
     * `Mutex.withLock` must release the lock, or every later holder deadlocks. Without the
     * timeout the outer `withTimeout` here would fire instead and the assertion would fail.
     */
    @Test
    fun `a hanging call inside a mutex releases the lock instead of wedging it`() = runBlocking {
        val lock = Mutex()
        val never = TaskCompletionSource<String>().task

        lock.withLock {
            runCatching { never.await(timeoutMs = 50) }
        }

        // If the timeout had not fired, the lock would still be held and this would time out.
        val reacquired = withTimeout(1_000) {
            lock.withLock { true }
        }
        assertTrue("the mutex must be reusable after a hanging call", reacquired)
        assertFalse(lock.isLocked)
    }

    /** Production must not silently run with a test-sized bound. */
    @Test
    fun `the default timeout is the production value`() {
        assertEquals(10_000L, TASK_TIMEOUT_MS)
    }
}
