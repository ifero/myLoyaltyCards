package com.iferoporefi.myloyaltycards.wear.presentation.theme

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material3.ColorScheme
import androidx.wear.compose.material3.MaterialTheme

/**
 * "Carbon Utility" — the minimalist, OLED-black, high-density watch design language shared with
 * watchOS (`docs/ux-design-specification.md` §Carbon). Card colours come from the catalogue, not
 * the theme, so this scheme only needs a true-black surface, white text, and the app's brand
 * primary for interactive Wear M3 components (RadioButton, EdgeButton).
 */

/** The card-row surface — one step above true black, mirroring watchOS's `#1C1C1F` row fill. */
val CarbonSurface: Color = Color(0xFF1C1C1F)

/** Favourite-badge tint: the phone's `theme.warning` on dark (`#F59E0B`), for star parity (AC3). */
val FavoriteStarTint: Color = Color(0xFFF59E0B)

// Declared before CarbonColorScheme so top-level initialization order gives it a real value.
private val BrandPrimaryDark: Color = Color(0xFF4DA3FF) // phone dark-theme `primary`

private val CarbonColorScheme: ColorScheme = ColorScheme(
    background = Color.Black,
    onBackground = Color.White,
    surfaceContainer = CarbonSurface,
    onSurface = Color.White,
    onSurfaceVariant = Color(0xFFB0B3B8), // dim secondary text
    primary = BrandPrimaryDark,
    onPrimary = Color.Black,
)

/** Wraps the app in the Carbon [ColorScheme]. */
@Composable
fun MyLoyaltyCardsWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = CarbonColorScheme, content = content)
}
