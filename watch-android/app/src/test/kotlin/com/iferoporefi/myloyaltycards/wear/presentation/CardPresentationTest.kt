package com.iferoporefi.myloyaltycards.wear.presentation

import com.iferoporefi.myloyaltycards.wear.data.WearCard
import com.iferoporefi.myloyaltycards.wear.generated.WearBrand
import com.iferoporefi.myloyaltycards.wear.generated.WearBrands
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Verifies the AC2 avatar rules and @ifero's brand-colour decision. */
class CardPresentationTest {
    private fun card(
        name: String = "Card",
        brandId: String? = null,
        colorHex: String? = null,
    ) = WearCard(
        id = "id",
        name = name,
        brandId = brandId,
        colorHex = colorHex,
        createdAt = "2026-01-01T00:00:00.000Z",
    )

    @Test
    fun catalogueCard_usesBrandColourAndBrandNameInitials() {
        val brand = WearBrands.ALL.first { it.id == "esselunga" }
        // The card carries a generic user colour ("blue"); the catalogue card must ignore it and
        // use the brand's real colour + brand-name initials (@ifero's decision; AC1/AC2).
        val presentation = presentationFor(card(name = "My Card", brandId = "esselunga", colorHex = "blue"))
        assertEquals(resolveCardColor(brand.color), presentation.avatarColor)
        assertEquals(initials(brand.name), presentation.initials)
    }

    @Test
    fun customCard_usesCardColourAndCardNameInitials() {
        val presentation = presentationFor(card(name = "Local Bakery", brandId = null, colorHex = "blue"))
        assertEquals(Rgb(0x1A, 0x73, 0xE8), presentation.avatarColor)
        assertEquals("LB", presentation.initials)
    }

    @Test
    fun missingOrUnparseableColour_fallsBackToNeutralGrey() {
        assertEquals(NEUTRAL_GREY, presentationFor(card(colorHex = null)).avatarColor)
        assertEquals(NEUTRAL_GREY, presentationFor(card(colorHex = "not-a-colour")).avatarColor)
    }

    @Test
    fun brandId_isNormalisedLikeWatchOs() {
        // Trims + lower-cases, treats blank as absent.
        assertNotNull(resolveBrand(" Esselunga "))
        assertEquals(resolveBrand("esselunga"), resolveBrand("  ESSELUNGA  "))
        assertEquals(null, resolveBrand("   "))
        assertEquals(null, resolveBrand("no-such-brand"))
    }

    @Test
    fun avatarInitialsSource_catalogueUsesBrandNameFallingBackToId() {
        val named = WearBrand("esselunga", "Esselunga", emptyList(), "", "#000000", null)
        assertEquals("Esselunga", avatarInitialsSource(named, "Ignored Card Name"))
        // AC2's explicit fallback: a blank brand name falls back to the brand id.
        val blankName = WearBrand("brand-x", "   ", emptyList(), "", "#000000", null)
        assertEquals("brand-x", avatarInitialsSource(blankName, "Ignored"))
    }

    @Test
    fun avatarInitialsSource_customUsesCardName() {
        assertEquals("Local Bakery", avatarInitialsSource(null, "Local Bakery"))
    }

    @Test
    fun contrastFlipsByBackgroundLuminance() {
        assertFalse(presentationFor(card(colorHex = "#FFFFFF")).useWhiteText) // light bg → dark text
        val dark = presentationFor(card(colorHex = "#000000"))
        assertTrue(dark.useWhiteText) // dark bg → white text
        assertTrue(dark.isNearBlackAvatar)
    }
}
