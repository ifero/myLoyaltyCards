package com.iferoporefi.myloyaltycards.wear.sync

/**
 * The phone ↔ watch wire contract (Story 10-6).
 *
 * Mirrored in two other places, because the Wear APK, the phone's native module and the JS
 * bundle share no build system:
 *
 * - `modules/wear-data-layer/android/src/main/java/expo/modules/weardatalayer/WearDataLayerContract.kt`
 * - `core/wear-connectivity.ts` (pinned by `core/wear-connectivity.test.ts`)
 *
 * Field names deliberately match the phone's existing `WatchCardPayload` and versioned
 * `WatchMessage` envelope exactly. One contract across watchOS, Wear OS and the phone is what
 * keeps `test-fixtures/sync-message-v1.json` meaningful on all three.
 */
internal object WearSyncContract {
    /** Namespace prefix every path in this app shares. */
    const val PATH_PREFIX = "/myloyaltycards"

    /** DataItem path carrying the full card snapshot (phone → watch). */
    const val SNAPSHOT_PATH = "$PATH_PREFIX/cards"

    /** `MessageClient` path for watch → phone control and usage messages. */
    const val MESSAGE_PATH = "$PATH_PREFIX/msg"

    /** `DataMap` key holding the JSON snapshot body. */
    const val KEY_PAYLOAD = "payload"

    /** `DataMap` key holding the envelope version. */
    const val KEY_VERSION = "version"

    /** The only envelope version this build understands. Anything else is ignored (AC11). */
    const val PROTOCOL_VERSION = 1

    /** Envelope `type` for the card snapshot. */
    const val TYPE_CARDS = "cards"

    /** Envelope `type` asking the phone to republish the snapshot (AC5). */
    const val TYPE_REQUEST_CARDS = "requestCards"

    /** Envelope `type` for a usage event — the ONE thing the watch may write (AC8). */
    const val TYPE_CARD_USED = "CARD_USED"

    /**
     * Capability the phone app advertises (`res/values/wear.xml` inside the phone's
     * `modules/wear-data-layer`). The watch listens for it to learn when the phone becomes
     * reachable, which is what drives the `requestCards` ping (AC5) and the outbox flush (AC15).
     */
    const val PHONE_CAPABILITY = "myloyaltycards_phone"
}
