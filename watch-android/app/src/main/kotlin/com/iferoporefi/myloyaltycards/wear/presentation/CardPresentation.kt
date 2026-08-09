package com.iferoporefi.myloyaltycards.wear.presentation

import com.iferoporefi.myloyaltycards.wear.data.WearCard
import com.iferoporefi.myloyaltycards.wear.generated.WearBrand
import com.iferoporefi.myloyaltycards.wear.generated.WearBrands

/** Case-insensitive lookup of catalogue brands by id. Brand ids are already lowercase slugs. */
private val brandsById: Map<String, WearBrand> by lazy { WearBrands.ALL.associateBy { it.id } }

/**
 * Resolves a card's [WearCard.brandId] to a catalogue brand, or `null` for a custom card.
 * Normalises like watchOS (`normalizedBrandId`): trims, lower-cases, treats blank as absent.
 */
fun resolveBrand(brandId: String?): WearBrand? {
    val normalized = brandId?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: return null
    return brandsById[normalized]
}

/**
 * The string a card's avatar initials are derived from: a catalogue card uses the **brand name**
 * (falling back to the brand id when the name is blank), a custom card uses the **card name** (AC2).
 * Extracted so the id-fallback branch is unit-testable without a blank-named catalogue entry.
 */
internal fun avatarInitialsSource(brand: WearBrand?, cardName: String): String =
    if (brand != null) brand.name.ifBlank { brand.id } else cardName

/**
 * Everything a [com.iferoporefi.myloyaltycards.wear.presentation.CardRow] needs to draw a card's
 * avatar, resolved as pure data so AC2's rules are unit-tested without rendering Compose.
 */
data class CardPresentation(
    val avatarColor: Rgb,
    val initials: String,
    val useWhiteText: Boolean,
    val isNearBlackAvatar: Boolean,
)

/**
 * Derives the avatar presentation for [card], mirroring watchOS's row rules, with the one
 * deliberate Wear improvement @ifero chose:
 *
 * - **Colour** — a catalogue card uses its **brand's** colour from `Brands.kt` (recognisable on the
 *   wrist; watchOS could not, its brand record had no colour); a custom card uses the user's picked
 *   colour ([WearCard.colorHex]). Missing/unparseable → [NEUTRAL_GREY] (Open Decision 6).
 * - **Initials** — a catalogue card from the **brand name** (falling back to the brand id), a custom
 *   card from the **card name** (AC2).
 * - **Text colour** — flips by background luminance ([shouldUseWhiteText]) (AC2).
 */
fun presentationFor(card: WearCard): CardPresentation {
    val brand = resolveBrand(card.brandId)
    val colorSource = if (brand != null) brand.color else card.colorHex
    val avatarColor = resolveCardColor(colorSource) ?: NEUTRAL_GREY
    return CardPresentation(
        avatarColor = avatarColor,
        initials = initials(avatarInitialsSource(brand, card.name)),
        useWhiteText = shouldUseWhiteText(avatarColor),
        isNearBlackAvatar = isNearBlack(avatarColor),
    )
}
