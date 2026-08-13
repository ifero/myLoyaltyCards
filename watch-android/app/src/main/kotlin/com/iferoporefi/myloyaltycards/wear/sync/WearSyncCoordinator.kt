package com.iferoporefi.myloyaltycards.wear.sync

import android.util.Log
import com.iferoporefi.myloyaltycards.wear.usage.UsageOutbox
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject

/**
 * Drives phone ↔ watch sync for the life of the process (Story 10-6).
 *
 * Three concurrent jobs, one per acceptance criterion that needs a trigger:
 *
 * 1. **Start-up read** (AC4) — read the DataItem that is already on this node. A DataItem written
 *    while the app was not running is never re-delivered as a change event, so without this a
 *    freshly installed watch shows an empty list until the phone next publishes.
 * 2. **Live snapshots** (AC3) — apply each snapshot as it arrives, so a card added or deleted on
 *    the phone shows up with no user action.
 * 3. **Reachability** (AC5, AC15) — when the phone becomes reachable, ask it to republish and
 *    flush the `CARD_USED` outbox.
 *
 * Started once from [com.iferoporefi.myloyaltycards.wear.WearGraph] on an application-lifetime
 * scope, never per Activity: `MainActivity` is recreated on any configuration change, and
 * re-running the start-up read and re-registering listeners on every recreation would waste the
 * radio for no benefit.
 */
internal class WearSyncCoordinator(
    private val transport: WearSyncTransport,
    private val applier: SnapshotApplier,
    private val outbox: UsageOutbox,
    private val scope: CoroutineScope,
    /**
     * Waits between outbox flush attempts. Injectable purely so tests do not sleep for seconds;
     * production always uses [DEFAULT_FLUSH_RETRY_DELAYS_MS].
     */
    private val flushRetryDelaysMs: List<Long> = DEFAULT_FLUSH_RETRY_DELAYS_MS,
) {
    /** Serialises applies so a start-up read and a live event can never interleave mid-replace. */
    private val applyMutex = Mutex()

    /**
     * Whether a live snapshot has already been applied.
     *
     * Guards a small but real ordering hazard: the start-up read and the listener run
     * concurrently, so a `readSnapshot()` issued at t0 can resolve *after* a change event
     * delivered at t1 — and because every apply is a full replace, letting the older read land
     * last would roll the watch back to a stale list. Once anything live has been applied, the
     * start-up read has nothing newer to offer and is dropped.
     */
    private var appliedLiveSnapshot = false

    fun start() {
        scope.launch { collectSnapshots() }
        scope.launch { performStartupRead() }
        scope.launch { collectReachability() }
    }

    private suspend fun collectSnapshots() {
        runCatching { transport.snapshots().collect { applySnapshot(it, live = true) } }
            .onFailure { Log.w(TAG, "snapshot subscription ended", it) }
    }

    private suspend fun performStartupRead() {
        val snapshot = runCatching { transport.readSnapshot() }
            .onFailure { Log.w(TAG, "start-up snapshot read failed", it) }
            .getOrNull() ?: return
        applySnapshot(snapshot, live = false)
    }

    private suspend fun collectReachability() {
        runCatching {
            transport.phoneReachable().collect { reachable ->
                if (!reachable) return@collect
                requestCards()
                flushOutbox()
            }
        }.onFailure { Log.w(TAG, "reachability subscription ended", it) }
    }

    /**
     * Drain the outbox, retrying with exponential backoff while anything is still owed.
     *
     * The retry is not belt-and-braces. "Reachable" and "a send will succeed" are different
     * claims: the capability can report the phone as present while an individual `sendMessage`
     * fails on a momentary radio drop, and a reachability *transition* is the only other thing
     * that triggers a flush. Without a retry the queue would then sit until the next card open or
     * the next app start. The schedule matches the project's documented watch-sync rule —
     * "3 attempts with exponential backoff" (`docs/project-context.md`).
     *
     * Stops as soon as the queue is empty, so the common case costs exactly one attempt.
     */
    private suspend fun flushOutbox() {
        var attempt = 0
        while (true) {
            val pending = runCatching {
                outbox.flush()
                outbox.pendingCount()
            }.onFailure { Log.w(TAG, "usage outbox flush failed", it) }.getOrNull()

            if (pending == 0) return
            if (attempt >= flushRetryDelaysMs.size) {
                // Give up for now; the events stay queued and the next reconnection, card open or
                // app start tries again. Nothing is lost — only deferred.
                Log.w(TAG, "usage outbox still has $pending event(s) after ${attempt + 1} attempt(s)")
                return
            }
            delay(flushRetryDelaysMs[attempt])
            attempt += 1
        }
    }

    /**
     * Ask the phone to republish the snapshot (AC5), mirroring
     * `WatchSessionManager.swift:146-147`.
     *
     * Worth sending even though the start-up read usually covers it: the read only sees what has
     * already synced to this node, and a watch that has never been paired with this phone build
     * has nothing to read.
     */
    private suspend fun requestCards() {
        val message = JSONObject()
            .put(WearSyncContract.KEY_VERSION, WearSyncContract.PROTOCOL_VERSION)
            .put("type", WearSyncContract.TYPE_REQUEST_CARDS)
            .toString()

        runCatching { transport.sendMessage(message) }
            .onFailure { Log.w(TAG, "requestCards send failed", it) }
    }

    private suspend fun applySnapshot(json: String, live: Boolean) {
        applyMutex.withLock {
            if (!live && appliedLiveSnapshot) return@withLock
            if (live) appliedLiveSnapshot = true

            when (val result = applier.apply(json)) {
                is SnapshotApplyResult.Applied ->
                    Log.i(TAG, "applied snapshot with ${result.cardCount} card(s)")
                is SnapshotApplyResult.Rejected ->
                    // The previous list is untouched (AC11). Logged rather than silently dropped:
                    // Wear OS has no crash/error telemetry in this project, so logcat is the only
                    // place a systematically rejected snapshot can be noticed at all.
                    Log.w(TAG, "rejected snapshot: ${result.reason}")
            }
        }
    }

    internal companion object {
        private const val TAG = "WearSync"

        /**
         * 1s then 2s — "3 attempts with exponential backoff" per the project's watch-sync rule.
         * Short enough that a transient radio drop is absorbed within a single glance, and
         * bounded so a genuinely absent phone costs three sends rather than a spin.
         */
        val DEFAULT_FLUSH_RETRY_DELAYS_MS: List<Long> = listOf(1_000L, 2_000L)
    }
}
