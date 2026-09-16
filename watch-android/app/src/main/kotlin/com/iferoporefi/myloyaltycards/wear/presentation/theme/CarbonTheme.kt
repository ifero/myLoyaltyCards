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

/**
 * Favourite-badge tint.
 *
 * ⚠️ KNOWINGLY STALE, and owned by Story 23.3. This used to be "the phone's `theme.warning` on
 * dark (`#F59E0B`), for star parity (AC3)" — both halves of that are now false. Story 21.2
 * repainted the phone's favourite star beam `#FCCC0C` on an ink plate and moved `theme.warning`
 * off amber entirely, so this value has no referent on the phone any more; and the Cardì system
 * bans orange by name, which `#F59E0B` is (it is bit-identical to the `orange` card key).
 * `cardi-watch-grammar.md` §4.3 and §4.4 already ruled: no orange value ships on any watch
 * surface, and the star takes beam. The colour is left here rather than changed because moving it
 * needs the emulator pass 23.3 carries — 21.2 touches no Kotlin behaviour.
 */
val FavoriteStarTint: Color = Color(0xFFF59E0B)

// Declared before CarbonColorScheme so top-level initialization order gives it a real value.
// ⚠️ KNOWINGLY STALE, owned by Story 23.3. This was the phone's dark-theme `primary`; Story 21.2
// made that beam `#FCCC0C`, and `cardi-watch-grammar.md` §4 puts beam with ink text here too.
private val BrandPrimaryDark: Color = Color(0xFF4DA3FF)

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
