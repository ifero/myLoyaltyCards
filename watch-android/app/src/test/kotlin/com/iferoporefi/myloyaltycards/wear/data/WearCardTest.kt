package com.iferoporefi.myloyaltycards.wear.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Guards the backward-compatible defaults a sparse sync payload relies on: a card whose payload
 * omits `isFavorite` renders as not-favourite, and the nullable fields default to absent (AC3,
 * mirroring 9-4's backward-compatible default).
 */
class WearCardTest {
    @Test
    fun requiredOnlyConstruction_appliesBackwardCompatibleDefaults() {
        val card = WearCard(id = "x", name = "Card", createdAt = "2026-01-01T00:00:00.000Z")
        assertFalse(card.isFavorite)
        assertNull(card.brandId)
        assertNull(card.colorHex)
        assertNull(card.lastUsedAt)
        assertNull(card.barcodeValue)
        assertNull(card.barcodeFormat)
        assertEquals(0, card.usageCount)
    }
}
