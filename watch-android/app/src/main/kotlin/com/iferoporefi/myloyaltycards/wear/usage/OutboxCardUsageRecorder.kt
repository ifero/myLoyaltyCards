package com.iferoporefi.myloyaltycards.wear.usage

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * The real [CardUsageRecorder] Story 10-4 left a no-op seam for (its AC8).
 *
 * Wiring it is the one-line swap in `MainActivity` that story predicted: the barcode screen is
 * unchanged and still knows only the seam.
 *
 * [recordCardUsed] is called from the barcode screen's `LaunchedEffect` and must not block it, so
 * the work is launched on an **application-lifetime** scope rather than the caller's. That is
 * load-bearing: a card open ends when the user drops their wrist, and a composition-scoped
 * coroutine would be cancelled mid-enqueue precisely when the user is most likely to be walking
 * away from the till. Enqueue is a single `INSERT OR IGNORE`, so it wins that race easily — but
 * only if nothing cancels it.
 *
 * The flush that follows is best-effort. If the phone is out of range the event stays queued and
 * [UsageOutbox] delivers it on the next connectivity signal or app start (AC15).
 */
internal class OutboxCardUsageRecorder(
    private val outbox: UsageOutbox,
    private val scope: CoroutineScope,
) : CardUsageRecorder {

    override fun recordCardUsed(cardId: String, openedAt: String) {
        scope.launch {
            // Enqueue first, unconditionally. Trying to send before persisting would lose the
            // event on the failure path — which is the only path that matters here.
            outbox.enqueue(cardId, openedAt)
            outbox.flush()
        }
    }
}
