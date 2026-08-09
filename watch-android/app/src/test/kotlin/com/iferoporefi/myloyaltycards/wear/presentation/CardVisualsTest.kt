package com.iferoporefi.myloyaltycards.wear.presentation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Verifies the ported colour/initials/contrast helpers (AC2). */
class CardVisualsTest {
    @Test
    fun parseHex_sixDigit() {
        assertEquals(Rgb(0x1A, 0x73, 0xE8), parseHexColor("#1A73E8"))
        assertEquals(Rgb(0x1A, 0x73, 0xE8), parseHexColor("1A73E8"))
    }

    @Test
    fun parseHex_threeDigitExpands() {
        // Brands.kt documents colours as #RRGGBB OR #RGB.
        assertEquals(Rgb(0xAA, 0xBB, 0xCC), parseHexColor("#abc"))
    }

    @Test
    fun parseHex_invalidReturnsNull() {
        assertNull(parseHexColor("xyz"))
        assertNull(parseHexColor("#12"))
        assertNull(parseHexColor("#12345"))
        assertNull(parseHexColor("#GGGGGG"))
    }

    @Test
    fun resolveCardColor_namedKeysMapToPalette() {
        assertEquals(Rgb(0x1A, 0x73, 0xE8), resolveCardColor("blue"))
        assertEquals(Rgb(0xE2, 0x23, 0x1A), resolveCardColor("red"))
        assertEquals(Rgb(0x16, 0xA3, 0x4A), resolveCardColor("green"))
        assertEquals(Rgb(0xF5, 0x9E, 0x0B), resolveCardColor("orange"))
        assertEquals(Rgb(0x64, 0x74, 0x8B), resolveCardColor("grey"))
        assertEquals(Rgb(0x64, 0x74, 0x8B), resolveCardColor("gray"))
    }

    @Test
    fun resolveCardColor_isCaseInsensitiveAndAcceptsHex() {
        assertEquals(Rgb(0x1A, 0x73, 0xE8), resolveCardColor("BLUE"))
        assertEquals(Rgb(0xFF, 0x00, 0x00), resolveCardColor("#FF0000"))
    }

    @Test
    fun resolveCardColor_nullBlankOrUnparseableReturnsNull() {
        assertNull(resolveCardColor(null))
        assertNull(resolveCardColor(""))
        assertNull(resolveCardColor("   "))
        assertNull(resolveCardColor("not-a-colour"))
    }

    @Test
    fun luminanceAndContrastExtremes() {
        assertEquals(0.0, relativeLuminance(Rgb(0, 0, 0)), 1e-9)
        assertTrue(relativeLuminance(Rgb(255, 255, 255)) > 0.99)
        assertTrue(shouldUseWhiteText(Rgb(0, 0, 0)))
        assertFalse(shouldUseWhiteText(Rgb(255, 255, 255)))
        assertTrue(isNearBlack(Rgb(0, 0, 0)))
        assertFalse(isNearBlack(Rgb(255, 255, 255)))
        assertFalse(isNearBlack(Rgb(0x1A, 0x73, 0xE8)))
    }

    @Test
    fun contrastDecisionMatchesPhoneLinearFormulaOnPalette() {
        // AC2/Task 2: the ported gamma-WCAG decision (threshold 0.4) agrees with the phone's
        // linear luminance.ts decision (threshold 0.5) across the virtual-logo palette + extremes,
        // so choosing the watchOS function does not diverge visibly from the phone.
        val palette = listOf(
            Rgb(0x1A, 0x73, 0xE8), Rgb(0xE2, 0x23, 0x1A), Rgb(0x16, 0xA3, 0x4A),
            Rgb(0xF5, 0x9E, 0x0B), Rgb(0x64, 0x74, 0x8B), Rgb(0, 0, 0), Rgb(255, 255, 255),
        )
        palette.forEach { rgb ->
            val phoneWantsWhite = phoneLinearLuminance(rgb) < 0.5
            assertEquals("contrast decision disagrees for $rgb", phoneWantsWhite, shouldUseWhiteText(rgb))
        }
    }

    @Test
    fun initials_matchesWatchOsRules() {
        assertEquals("LB", initials("Local Bakery"))
        assertEquals("ES", initials("Esselunga"))
        assertEquals("A", initials("a"))
        assertEquals("", initials(""))
        assertEquals("", initials("   "))
        assertEquals("FB", initials("  Foo   Bar  ")) // collapses runs of whitespace
        assertEquals("X", initials("X"))
    }

    /** The phone's simplified linear luminance (`shared/theme/luminance.ts` `getLuminance`). */
    private fun phoneLinearLuminance(rgb: Rgb): Double =
        (0.2126 * rgb.red + 0.7152 * rgb.green + 0.0722 * rgb.blue) / 255.0
}
