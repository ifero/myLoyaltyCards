package com.iferoporefi.myloyaltycards.wear.data

/**
 * Sample cards for the DEBUG-only empty-state seeder.
 *
 * Mirrors watchOS's DEBUG `importSampleCards` (`CardListView.swift`). Every caller is either behind
 * `BuildConfig.DEBUG` (the empty-state seeder in `MainActivity`) or an unused `@Preview`-only function,
 * so R8 strips this object from the release APK either way — the seeder stays debug-only *and*
 * empty-state-gated from the start (watchOS had to retrofit that gating in 9-5).
 *
 * The first three exercise the whole list at a glance: a favourite, a catalogue brand (so the
 * avatar shows the real brand colour + brand-name initials), a never-used card, and an accented
 * name to eyeball the diacritic-insensitive A-Z ordering.
 *
 * The remainder were added for Story 10-4 so the barcode screen can be eyeballed for **every**
 * format ZXing renders (CODE128, EAN8, CODE39 join the EAN13/UPCA/QR above) and for **both** error
 * states — an unsupported format and an invalid value. All barcode values below are real and valid
 * except the two deliberately-broken cards, whose names say so.
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
        WearCard(
            id = "sample-code128",
            name = "Code128 Store",
            brandId = null,
            colorHex = "orange",
            barcodeValue = "ABC-1234", // Code128 is alphanumeric
            barcodeFormat = "CODE128",
            usageCount = 3,
            lastUsedAt = "2026-07-25T09:00:00.000Z",
            createdAt = "2026-04-01T09:00:00.000Z",
            isFavorite = false,
        ),
        WearCard(
            id = "sample-ean8",
            name = "EAN-8 Kiosk",
            brandId = null,
            colorHex = "green",
            barcodeValue = "96385074", // valid EAN-8 (check digit 4)
            barcodeFormat = "EAN8",
            usageCount = 1,
            lastUsedAt = "2026-07-10T09:00:00.000Z",
            createdAt = "2026-04-05T09:00:00.000Z",
            isFavorite = false,
        ),
        WearCard(
            id = "sample-code39",
            name = "Code39 Club",
            brandId = null,
            colorHex = "grey",
            barcodeValue = "CODE-39", // Code39 charset: A–Z 0–9 and - . $ / + % space
            barcodeFormat = "CODE39",
            usageCount = 0,
            lastUsedAt = null,
            createdAt = "2026-04-06T09:00:00.000Z",
            isFavorite = false,
        ),
        WearCard(
            id = "sample-bad-value",
            name = "Bad Checksum (invalid)", // EAN-13 with a wrong check digit → invalid-value error
            brandId = null,
            colorHex = "red",
            barcodeValue = "5901234123450",
            barcodeFormat = "EAN13",
            usageCount = 0,
            lastUsedAt = null,
            createdAt = "2026-04-07T09:00:00.000Z",
            isFavorite = false,
        ),
        WearCard(
            id = "sample-bad-format",
            name = "Aztec (unsupported)", // not one of the six app formats → unsupported-format error
            brandId = null,
            colorHex = "blue",
            barcodeValue = "anything",
            barcodeFormat = "AZTEC",
            usageCount = 0,
            lastUsedAt = null,
            createdAt = "2026-04-08T09:00:00.000Z",
            isFavorite = false,
        ),
    )
}
