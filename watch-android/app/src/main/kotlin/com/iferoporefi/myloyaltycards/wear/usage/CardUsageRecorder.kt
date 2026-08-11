package com.iferoporefi.myloyaltycards.wear.usage

/**
 * The single seam that Story 10.6 implements as the `CARD_USED` Wearable Data Layer emission (AC8).
 *
 * This story deliberately does **not** implement the transport — it only calls this seam when a
 * barcode appears, exactly where watchOS emits its usage event (`BarcodeFlashView.swift:109`, on the
 * barcode screen appearing, **not** on the list tap), so the two platforms count the same event.
 *
 * @see NoOpCardUsageRecorder the default until 10.6 wires the Data Layer.
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
 * The default [CardUsageRecorder] until Story 10.6 provides a real one. It does nothing on purpose:
 * this story must not implement the Data Layer (AC8). Wiring 10.6 is a one-line swap in
 * `MainActivity` — no change to the barcode screen, which only knows the seam.
 */
object NoOpCardUsageRecorder : CardUsageRecorder {
    override fun recordCardUsed(cardId: String, openedAt: String) = Unit
}
