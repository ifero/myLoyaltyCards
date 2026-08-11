package com.iferoporefi.myloyaltycards.wear.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The mappers are pure functions, so this is a plain JVM test — no Robolectric, no database. It
 * guards the one explicit wire↔entity↔domain boundary (AC7): the field renames, the
 * absent-field defaults, and nullability.
 */
class CardMappersTest {
    @Test
    fun wirePayloadMapsToEntityWithRenames() {
        val payload =
            WatchCardPayload(
                id = "id-1",
                name = "Esselunga",
                brandId = "esselunga",
                colorHex = "#1A73E8",
                barcodeValue = "5901234123457",
                barcodeFormat = "EAN13",
                barcodeImageBase64 = "SHOULD_NOT_BE_PERSISTED",
                usageCount = 12,
                lastUsedAt = "2026-08-01T09:00:00.123Z",
                createdAt = "2026-01-10T09:00:00.000Z",
                isFavorite = true,
            )

        val entity = payload.toEntity(rawPayload = """{"id":"id-1"}""")

        // Renames happen here and nowhere else.
        assertEquals("5901234123457", entity.barcode) // barcodeValue -> barcode
        assertEquals("#1A73E8", entity.color) // colorHex -> color
        // Straight-through fields.
        assertEquals("id-1", entity.id)
        assertEquals("esselunga", entity.brandId)
        assertEquals("EAN13", entity.barcodeFormat)
        assertEquals(12, entity.usageCount)
        assertEquals("2026-08-01T09:00:00.123Z", entity.lastUsedAt)
        assertEquals("2026-01-10T09:00:00.000Z", entity.createdAt)
        assertEquals(true, entity.isFavorite)
        assertEquals("""{"id":"id-1"}""", entity.rawPayload)
        // `barcodeImageBase64` cannot leak into the entity: there is structurally no column for it
        // (Open Decision 4 / AC8). Actively STRIPPING it from the raw payload text is Story 10-6's
        // job — it owns the transport that builds rawPayload — so it is deliberately not asserted here.
    }

    @Test
    fun absentOptionalFieldsFallBackToDefaults() {
        // A payload that omits isFavorite/usageCount/brandId/lastUsedAt (an older or newer phone
        // build) must not crash and must default (9-4: isFavorite=false; AC7: usageCount=0).
        val payload =
            WatchCardPayload(
                id = "id-2",
                name = "Custom",
                colorHex = "red",
                barcodeValue = "012345678905",
                barcodeFormat = "UPCA",
                createdAt = "2026-03-15T09:00:00.000Z",
            )

        val entity = payload.toEntity()

        assertFalse(entity.isFavorite)
        assertEquals(0, entity.usageCount)
        assertNull(entity.brandId)
        assertNull(entity.lastUsedAt)
        assertNull(entity.updatedAt) // no wire source (Open Decision 3)
        assertNull(entity.rawPayload)
    }

    @Test
    fun entityMapsBackToWearCardWithRenames() {
        val entity =
            CardEntity(
                id = "id-3",
                name = "Market",
                brandId = null,
                barcode = "https://example.com",
                barcodeFormat = "QR",
                color = "#16A34A",
                isFavorite = false,
                lastUsedAt = null,
                usageCount = 0,
                createdAt = "2026-05-01T09:00:00.000Z",
            )

        val wearCard = entity.toWearCard()

        assertEquals("https://example.com", wearCard.barcodeValue) // barcode -> barcodeValue
        assertEquals("#16A34A", wearCard.colorHex) // color -> colorHex
        assertEquals("id-3", wearCard.id)
        assertEquals("QR", wearCard.barcodeFormat)
        assertNull(wearCard.brandId)
        assertNull(wearCard.lastUsedAt)
    }

    @Test
    fun wearCardMapsToEntityForSeeding() {
        // The DEBUG seeder path: WearCard (nullable barcode/format/colour) -> entity (non-null).
        val wearCard =
            WearCard(
                id = "seed-1",
                name = "Seed",
                barcodeValue = null,
                barcodeFormat = null,
                colorHex = null,
                createdAt = "2026-01-01T00:00:00.000Z",
            )

        val entity = wearCard.toEntity()

        assertEquals("", entity.barcode)
        assertEquals("", entity.barcodeFormat)
        assertEquals("", entity.color)
        assertNull(entity.rawPayload)
    }
}
