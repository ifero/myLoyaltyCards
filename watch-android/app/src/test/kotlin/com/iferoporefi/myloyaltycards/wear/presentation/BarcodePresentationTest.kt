package com.iferoporefi.myloyaltycards.wear.presentation

import org.junit.Assert.assertEquals
import org.junit.Test

/** AC1 title-level context: a trimmed card name, or the localised fallback when blank/absent. */
class BarcodePresentationTest {
    @Test
    fun usesTheTrimmedCardName() {
        assertEquals("Esselunga", barcodeScreenTitle("  Esselunga  ", fallback = "Card"))
    }

    @Test
    fun blankOrNullNameFallsBack() {
        assertEquals("Card", barcodeScreenTitle("   ", fallback = "Card"))
        assertEquals("Card", barcodeScreenTitle("", fallback = "Card"))
        assertEquals("Card", barcodeScreenTitle(null, fallback = "Card"))
    }
}
