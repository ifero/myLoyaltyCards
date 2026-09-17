/**
 * Map HEX color to CardColor
 * Story 3.3: Brand color mapping utility
 * Story 21.2a: buckets RE-DERIVED for the Cardì accents (AC3)
 *
 * Maps an arbitrary brand HEX to the nearest of the five card accents, which is
 * the colour a catalogue card falls back to when its brand cannot be resolved
 * (`features/add-card/screens/CardSetupScreen.tsx`).
 *
 * ## Why this is a perceptual match rather than RGB-channel branches
 *
 * Until Story 21.2a this function was a ladder of hand-tuned RGB comparisons
 * (`r > 150 && g > 80 && b < 120`, `max - min < 30`, …) whose constants were
 * fitted to the five hexes that shipped in 2025 — and were tied to them by
 * nothing at all, so repainting the palette left the ladder matching against
 * colours the app no longer contains. The Cardì palette breaks that shape
 * outright: it holds **two blues** (deep `#0C3C84` and azure `#0C84CC`) that no
 * channel comparison separates, **no neutral**, and a **yellow** where the
 * banned orange used to be.
 *
 * So the question is answered in a perceptually uniform space instead. Each
 * accent and the input are converted to Oklab (Björn Ottosson, 2020 — the space
 * behind CSS Color 4's `oklch()`), and the input takes the key of the nearest
 * accent. There are no magic thresholds left to re-fit: repaint the palette and
 * the buckets re-derive themselves.
 *
 * Two deliberate refinements on plain Euclidean distance:
 *
 *  - **Lightness is weighted to {@link LIGHTNESS_WEIGHT}.** The accents span a
 *    wide lightness range (deep blue L=0.37 … beam yellow L=0.86), and at full
 *    weight that range dominates hue: pure green `#00FF00` is very light, so it
 *    would land on yellow rather than on the darker Cardì green. Halving the
 *    lightness term restores hue as the primary signal while leaving enough
 *    lightness to split the two blues, which sit only 15° apart in hue but 0.22
 *    apart in L.
 *  - **Achromatic input short-circuits to {@link DEFAULT_CARD_COLOR}.** A colour
 *    with no hue cannot be placed on a five-hue palette, and nearest-neighbour
 *    would answer with whichever accent happened to match its lightness — pure
 *    white landing on beam yellow, pure black on the deep blue. Fifteen of the
 *    57 catalogue brands are pure black or pure white, so this is the common
 *    case, not an edge one.
 */

import { CardColor, DEFAULT_CARD_COLOR } from '@/core/schemas/card';

/**
 * The five accents, keyed by the frozen `CardColor` identifiers.
 *
 * ⚠️ A COPY of `CARD_COLORS` in `shared/theme/tokens.generated.ts`, and it has to
 * be: `core` may import only from `core` and `catalogue` (eslint
 * `boundaries/element-types`), and the generated tokens live under `shared`.
 *
 * It cannot drift. `mapHexToCardColor.test.ts` asserts `ACCENT_PALETTE` equals
 * `CARD_COLORS` — test files are exempt from the boundary rule, so the test can
 * reach across it even though this module cannot. Edit `tokens/color.json`, run
 * `yarn tokens:build`, and mirror the values here; the test fails until you do.
 */
export const ACCENT_PALETTE: Record<CardColor, string> = {
  blue: '#0C3C84',
  red: '#E42424',
  green: '#0C843C',
  orange: '#FCCC0C',
  grey: '#0C84CC'
};

/**
 * Oklab chroma below which a colour counts as having no hue.
 *
 * Chosen from the data rather than by feel: across the catalogue's 44 distinct
 * brand colours the genuine neutrals top out at 0.0235 (`#151B26`, Unieuro) and
 * the first genuinely chromatic value is 0.0458 (`#001526`, OVS), so the
 * threshold sits in a real gap. It must also stay below every accent's own
 * chroma or an accent would classify itself as neutral; the smallest is the deep
 * blue's 0.1311, over three times this value.
 */
export const ACHROMATIC_CHROMA_THRESHOLD = 0.04;

/**
 * Weight applied to the Oklab lightness difference. See the module comment —
 * 1.0 sends pure green to yellow, and below ~0.3 the two blues stop separating.
 */
const LIGHTNESS_WEIGHT = 0.5;

type Oklab = { L: number; a: number; b: number };

/**
 * Convert HEX to RGB. Six digits only, with or without `#`; `null` when the
 * string is not a colour we can read.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * sRGB gamma decode, 0-255 in, 0-1 linear out.
 *
 * ⚠️ The breakpoint is `0.04045`, and the repo's other gamma decodes use `0.03928`
 * (`shared/theme/colors.contrast.test.ts`, `targets/watch/ColorHelpers.swift`,
 * `targets/watch-widget/WidgetCardPalette.swift`, `CardVisuals.kt`). That is not a
 * bug on either side and they must not be "unified": `0.03928` is the value WCAG 2.x
 * literally prints, and those four compute WCAG relative luminance; `0.04045` is the
 * sRGB specification's own breakpoint, which is what the Oklab conversion below is
 * defined against. They differ over a 0.0001-wide sliver of input and change linear
 * output in the sixth decimal, so neither is visibly wrong — but each is only correct
 * for its own formula.
 */
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * sRGB → Oklab, using Ottosson's published matrices. Verified against the
 * reference values for white, black and the three sRGB primaries.
 */
function rgbToOklab({ r, g, b }: { r: number; g: number; b: number }): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lCbrt = Math.cbrt(l);
  const mCbrt = Math.cbrt(m);
  const sCbrt = Math.cbrt(s);

  return {
    L: 0.2104542553 * lCbrt + 0.793617785 * mCbrt - 0.0040720468 * sCbrt,
    a: 1.9779984951 * lCbrt - 2.428592205 * mCbrt + 0.4505937099 * sCbrt,
    b: 0.0259040371 * lCbrt + 0.7827717662 * mCbrt - 0.808675766 * sCbrt
  };
}

/** Oklab chroma (distance from the neutral axis) for a hex, or `null` if unreadable. */
export function chromaOf(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const { a, b } = rgbToOklab(rgb);
  return Math.hypot(a, b);
}

/** The palette in Oklab, computed once — this runs on every card creation. */
const PALETTE_OKLAB: { key: CardColor; lab: Oklab }[] = (
  Object.entries(ACCENT_PALETTE) as [CardColor, string][]
).map(([key, hex]) => ({ key, lab: rgbToOklab(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }) }));

/**
 * Map a brand HEX to the nearest card accent.
 *
 * Returns {@link DEFAULT_CARD_COLOR} for input that is unreadable or has no hue.
 * Total and deterministic: every input produces one of the five frozen keys.
 */
export function mapHexToCardColor(hex: string): CardColor {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return DEFAULT_CARD_COLOR;
  }

  const target = rgbToOklab(rgb);

  if (Math.hypot(target.a, target.b) < ACHROMATIC_CHROMA_THRESHOLD) {
    return DEFAULT_CARD_COLOR;
  }

  let nearestKey: CardColor = DEFAULT_CARD_COLOR;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const { key, lab } of PALETTE_OKLAB) {
    const deltaL = LIGHTNESS_WEIGHT * (target.L - lab.L);
    const deltaA = target.a - lab.a;
    const deltaB = target.b - lab.b;
    const distance = deltaL * deltaL + deltaA * deltaA + deltaB * deltaB;

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestKey = key;
    }
  }

  return nearestKey;
}
