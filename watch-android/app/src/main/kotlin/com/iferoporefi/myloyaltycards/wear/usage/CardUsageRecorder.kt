package com.iferoporefi.myloyaltycards.wear.usage

/**
 * The single seam through which a card open becomes a `CARD_USED` event (AC8 of Story 10.4).
 *
 * Called when a barcode appears — exactly where watchOS emits its usage event
 * (`BarcodeFlashView.swift:109`, on the barcode screen appearing, **not** on the list tap) — so
 * the two platforms count the same event.
 *
 * Story 10.6 supplies the real implementation, [OutboxCardUsageRecorder], which persists the
 * event to a durable outbox and delivers it whenever the phone is next reachable. The barcode
 * screen still knows only this seam.
 *
 * @see NoOpCardUsageRecorder the inert default used by previews and UI tests.
 */
fun interface CardUsageRecorder {
    /**
     * Records that the card identified by [cardId] had its barcode opened at [openedAt].
     *
     * [openedAt] is an ISO-8601 UTC timestamp with **millisecond** precision (ADR-2026-06-09-001):
     * the phone dedups usage events by `"<cardId>:<openedAt>"`, and second precision is explicitly
     * non-conformant — the phone's parser rejects it. The open time is captured on the barcode
     * screen (not at transport time), because a card open and its eventual sync can be seconds apart
     * (10.6's durable outbox), and the dedup key must reflect when the user actually used the card.
     */
    fun recordCardUsed(cardId: String, openedAt: String)
}

/**
 * A [CardUsageRecorder] that does nothing.
 *
 * Retained as `WearApp`'s default argument so Compose previews and UI tests can render the
 * barcode screen without standing up a database and a Data Layer transport. The real app wires
 * [OutboxCardUsageRecorder] from `MainActivity`.
 */
object NoOpCardUsageRecorder : CardUsageRecorder {
    override fun recordCardUsed(cardId: String, openedAt: String) = Unit
}
