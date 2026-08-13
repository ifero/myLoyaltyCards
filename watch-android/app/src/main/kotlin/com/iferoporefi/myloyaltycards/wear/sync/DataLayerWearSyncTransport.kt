package com.iferoporefi.myloyaltycards.wear.sync

import android.content.Context
import com.google.android.gms.tasks.Task
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataItem
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * The real [WearSyncTransport], backed by Google Play services (Story 10-6).
 *
 * This is the only file in the module that touches `DataClient` / `MessageClient` /
 * `CapabilityClient`, which is what keeps every other piece of sync logic unit-testable on the
 * JVM. It contains no card knowledge and no policy — just Play services plumbing.
 */
internal class DataLayerWearSyncTransport(context: Context) : WearSyncTransport {

    private val appContext = context.applicationContext
    private val dataClient: DataClient get() = Wearable.getDataClient(appContext)
    private val messageClient get() = Wearable.getMessageClient(appContext)
    private val capabilityClient: CapabilityClient get() = Wearable.getCapabilityClient(appContext)
    private val nodeClient get() = Wearable.getNodeClient(appContext)

    /**
     * AC4's mandatory start-up read.
     *
     * Enumerates every DataItem and filters by path in Kotlin rather than passing a filter URI.
     * A Data Layer URI is `wear://<nodeId><path>`, so a path-only URI needs the caller to get the
     * host and the filter mode exactly right to match an item written by the *phone's* node — and
     * getting it subtly wrong fails silently, as an empty result indistinguishable from
     * "the phone has not published yet". The set being filtered is at most a handful of items:
     * the Data Layer is scoped to this application ID, and this app writes exactly one path.
     */
    override suspend fun readSnapshot(): String? =
        dataClient.getDataItems().await()?.use { buffer ->
            buffer.firstOrNull { it.uri.path == WearSyncContract.SNAPSHOT_PATH }?.let(::extractPayload)
        }

    override fun snapshots(): Flow<String> = callbackFlow {
        val listener = DataClient.OnDataChangedListener { events ->
            // The buffer is owned by the framework and released once this callback returns, so
            // it is read synchronously here and deliberately NOT closed.
            for (event in events) {
                // TYPE_DELETED is ignored on purpose: the phone signals "no cards" by publishing
                // an EMPTY snapshot, never by deleting the item. Treating a delete as "wipe the
                // watch" would hand a transport hiccup the power to clear the user's list.
                if (event.type != DataEvent.TYPE_CHANGED) continue
                val item = event.dataItem
                if (item.uri.path != WearSyncContract.SNAPSHOT_PATH) continue
                extractPayload(item)?.let(::trySend)
            }
        }

        dataClient.addListener(listener).await()
        awaitClose { dataClient.removeListener(listener) }
    }

    override fun phoneReachable(): Flow<Boolean> = callbackFlow {
        val listener = CapabilityClient.OnCapabilityChangedListener { info ->
            trySend(info.nodes.isNotEmpty())
        }

        capabilityClient.addListener(listener, WearSyncContract.PHONE_CAPABILITY).await()

        // Seed with the CURRENT state. `addListener` reports changes only, so a watch that
        // starts up with the phone already connected would otherwise never see a `true` — the
        // same "changes are not state" trap that makes AC4's start-up read mandatory.
        val current = runCatching {
            capabilityClient
                .getCapability(WearSyncContract.PHONE_CAPABILITY, CapabilityClient.FILTER_REACHABLE)
                .await()
        }.getOrNull()
        trySend(current?.nodes?.isNotEmpty() == true)

        awaitClose { capabilityClient.removeListener(listener, WearSyncContract.PHONE_CAPABILITY) }
    }.distinctUntilChanged()

    override suspend fun sendMessage(json: String): Boolean {
        val body = json.toByteArray(Charsets.UTF_8)
        val targets = resolveTargets()
        if (targets.isEmpty()) return false

        var delivered = 0
        for (node in targets) {
            val sent = runCatching {
                messageClient.sendMessage(node.id, WearSyncContract.MESSAGE_PATH, body).await()
            }.isSuccess
            if (sent) delivered += 1
        }
        return delivered > 0
    }

    /**
     * Nodes worth sending to: those advertising the phone app's capability, falling back to every
     * connected node.
     *
     * The capability query is the precise answer — a node can be connected while the companion
     * app is not installed, and a message to it fails in a way indistinguishable from being
     * offline. The fallback exists because this platform has no telemetry: if the capability
     * declaration is ever wrong or missing, the fallback degrades sync to "less precise" rather
     * than to "silently never delivers anything", which nobody would notice.
     */
    private suspend fun resolveTargets(): List<Node> {
        val capable = runCatching {
            capabilityClient
                .getCapability(WearSyncContract.PHONE_CAPABILITY, CapabilityClient.FILTER_REACHABLE)
                .await()
                ?.nodes
                ?.toList()
        }.getOrNull().orEmpty()

        if (capable.isNotEmpty()) return capable
        return runCatching { nodeClient.connectedNodes.await() }.getOrNull().orEmpty()
    }

    /** The JSON body of a snapshot DataItem, or `null` if the envelope is not the shape we wrote. */
    private fun extractPayload(item: DataItem): String? {
        val dataMap = runCatching { DataMapItem.fromDataItem(item).dataMap }.getOrNull() ?: return null
        return dataMap.getString(WearSyncContract.KEY_PAYLOAD)
    }
}

/**
 * Seconds to wait for any single Play services call before giving up.
 *
 * **This bound is load-bearing, not defensive dressing.** `UsageOutbox.flush()` runs inside a
 * `Mutex.withLock`, and a Kotlin mutex is released when the critical section *completes* — a
 * coroutine that suspends forever holds it forever. So one `sendMessage` that never settles would
 * wedge the outbox singleton for the rest of the process: every later card open and every later
 * reconnection would deadlock on the same lock, and `runCatching` cannot help because nothing is
 * ever thrown. Usage events would then stop syncing, silently and permanently, on a platform with
 * no crash reporting at all.
 *
 * Story 16-10 is the phone-side precedent for exactly this shape of bug (an unguarded `await` with
 * no timeout hung cold start forever), and the phone half of this transport
 * (`WearDataLayerModule.kt`) already bounds every call the same way. Ten seconds is generously
 * above a healthy Bluetooth round trip.
 */
internal const val TASK_TIMEOUT_MS = 10_000L

/**
 * Suspend until this [Task] settles, or [timeoutMs] elapses.
 *
 * Hand-rolled rather than pulling in `kotlinx-coroutines-play-services` — the whole adapter is
 * these few lines, and this story adds no dependency it does not need. Returns `T?` so a
 * `Task<Void>` (whose result is always null) can share one helper with value-returning tasks.
 *
 * On timeout this throws `TimeoutCancellationException`, which every caller already handles: the
 * `runCatching` wrappers in this file and in [WearSyncCoordinator] turn it into a logged failure
 * and a retry, which is precisely the behaviour an unresponsive radio should produce.
 *
 * [timeoutMs] is a parameter only so a test can assert the bound in milliseconds instead of
 * waiting ten real seconds; production never passes it.
 */
internal suspend fun <T> Task<T>.await(timeoutMs: Long = TASK_TIMEOUT_MS): T? =
    withTimeout(timeoutMs) {
        suspendCancellableCoroutine { continuation ->
            // A DIRECT executor, not the default. `addOnCompleteListener(listener)` posts to the
            // MAIN looper, which is wrong here twice over: every Data Layer call would take a
            // pointless hop onto the UI thread just to resume a coroutine that is already on a
            // background dispatcher, and the resumption would depend on that looper actually
            // pumping. Resuming on whichever thread completed the task is what a coroutine
            // adapter wants, and it is also what makes this unit-testable without Robolectric —
            // a plain JVM test has no main looper, so the default overload never fires at all.
            addOnCompleteListener(Executor(Runnable::run)) { task ->
                val error = task.exception
                when {
                    error != null -> continuation.resumeWithException(error)
                    task.isCanceled -> continuation.cancel()
                    else -> continuation.resume(task.result)
                }
            }
        }
    }
