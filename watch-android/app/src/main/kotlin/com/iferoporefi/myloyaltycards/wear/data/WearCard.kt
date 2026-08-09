package com.iferoporefi.myloyaltycards.wear.data

/**
 * Read-only snapshot of one loyalty card as it reaches the watch.
 *
 * Mirrors the decoded shape of watchOS's `WatchCard` (`targets/watch/CardListView.swift`)
 * and the phone's `WatchCardPayload` (`core/watch-connectivity.ts`), so the three surfaces
 * share one vocabulary. Every field the Wear card list and its sort need is here and nothing
 * more — no `barcodeImageBase64`, because the list draws initials, not artwork, and Story
 * 10-4 owns the barcode screen.
 *
 * Two rules borrowed straight from `docs/project-context.md`:
 * - **Dates are strings.** [lastUsedAt] and [createdAt] stay ISO-8601 text and are parsed
 *   only when [com.iferoporefi.myloyaltycards.wear.sort.CardSorter] needs to compare them.
 *   Do not add `Instant`-typed fields that Story 10-5/10-6 would have to undo.
 * - **Absent fields default, they don't crash.** [isFavorite] defaults to `false` so a card
 *   whose payload omits it renders as not-favourite (AC3, mirroring 9-4's backward-compatible
 *   default); [brandId] and [lastUsedAt] are nullable.
 *
 * @property id Stable card id (client-generated UUID on the phone).
 * @property name Display name.
 * @property brandId Catalogue brand slug, or `null` for a custom card.
 * @property colorHex The card's colour as sent by the phone: either a `#RRGGBB` hex or one of
 *   the virtual-logo palette keys (`blue`/`red`/`green`/`orange`/`grey`). See
 *   `core/watch-connectivity.ts` (`colorHex: card.color`).
 * @property barcodeValue Raw barcode payload; carried for the Story 10-4 barcode screen.
 * @property barcodeFormat Barcode symbology (e.g. `EAN13`, `QR`); carried for Story 10-4.
 * @property usageCount Times the card was used; drives the `frequent` sort.
 * @property lastUsedAt ISO-8601 timestamp of last use, or `null` if never used.
 * @property createdAt ISO-8601 timestamp of creation.
 * @property isFavorite Whether the card is pinned as a favourite. Defaults to `false`.
 */
data class WearCard(
    val id: String,
    val name: String,
    val brandId: String? = null,
    val colorHex: String? = null,
    val barcodeValue: String? = null,
    val barcodeFormat: String? = null,
    val usageCount: Int = 0,
    val lastUsedAt: String? = null,
    val createdAt: String,
    val isFavorite: Boolean = false,
)
