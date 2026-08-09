package com.iferoporefi.myloyaltycards.wear.data

/**
 * Sample cards for the DEBUG-only empty-state seeder.
 *
 * Mirrors watchOS's DEBUG `importSampleCards` (`CardListView.swift`). Every caller is either behind
 * `BuildConfig.DEBUG` (the empty-state seeder in `MainActivity`) or an unused `@Preview`-only function,
 * so R8 strips this object from the release APK either way — the seeder stays debug-only *and*
 * empty-state-gated from the start (watchOS had to retrofit that gating in 9-5).
 *
 * The data is chosen to exercise the whole list at a glance: a favourite, a catalogue brand (so
 * the avatar shows the real brand colour + brand-name initials), a never-used card, and an
 * accented name to eyeball the diacritic-insensitive A-Z ordering.
 */
object DebugSampleCards {
    val CARDS: List<WearCard> = listOf(
        WearCard(
            id = "sample-esselunga",
            name = "Esselunga",
            brandId = "esselunga", // real catalogue slug → brand colour + "ES" from the brand name
            colorHex = "blue",
            barcodeValue = "5901234123457",
            barcodeFormat = "EAN13",
            usageCount = 12,
            lastUsedAt = "2026-08-01T09:00:00.000Z",
            createdAt = "2026-01-10T09:00:00.000Z",
            isFavorite = true,
        ),
        WearCard(
            id = "sample-bakery",
            name = "Local Bakery",
            brandId = null, // custom card → user-picked colour + "LB" from the card name
            colorHex = "red",
            barcodeValue = "012345678905",
            barcodeFormat = "UPCA",
            usageCount = 5,
            lastUsedAt = "2026-07-20T09:00:00.000Z",
            createdAt = "2026-03-15T09:00:00.000Z",
            isFavorite = false,
        ),
        WearCard(
            id = "sample-market",
            name = "Èsselunga Market", // accented leading char: must sort next to "Esselunga"
            brandId = null,
            colorHex = "#16A34A",
            barcodeValue = "https://example.com",
            barcodeFormat = "QR",
            usageCount = 0,
            lastUsedAt = null, // never used → tiers below used cards in `frequent`
            createdAt = "2026-05-01T09:00:00.000Z",
            isFavorite = false,
        ),
    )
}
