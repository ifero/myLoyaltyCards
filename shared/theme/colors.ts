/**
 * Color Constants
 * Story 13.1: Implement Design System Tokens & Components
 * Story 21.2: Migrate the colour tokens to Ink & Beam
 *
 * Primitive color records (IDENTITY_COLORS, CARD_COLORS, NEUTRAL_COLORS, and the
 * per-theme color maps) are generated from the DTCG token JSON under `tokens/`
 * via Style Dictionary — see `tokens.generated.ts` (Story 16.4). Edit the JSON
 * and run `yarn tokens:build` to change a value. The catalogue-runtime brand
 * map, the non-token `statusBar` literal, and the BARCODE_FLASH values stay
 * hand-authored here.
 */
import {
  CARD_COLORS as CARD_COLORS_TOKENS,
  DARK_THEME_COLORS,
  IDENTITY_COLORS,
  LIGHT_THEME_COLORS,
  NEUTRAL_COLORS
} from './tokens.generated';
import catalogueData from '../../catalogue/italy.json';

// IDENTITY_COLORS is OURS -- the Cardi ink/beam/cream marks, and since Story
// 21.2 the source every theme value below is derived from. Not to be confused
// with BRAND_COLORS below, which maps 57 RETAILER brands to their own colours.
export { IDENTITY_COLORS, NEUTRAL_COLORS };

/**
 * Card color type - matches core/schemas/card.ts CardColor
 * Duplicated here to keep this token module dependency-free.
 */
type CardColor = 'blue' | 'red' | 'green' | 'orange' | 'grey';

/**
 * 5-color card palette for Virtual Logo system
 * Used when cards don't have official logos
 */
export const CARD_COLORS: Record<CardColor, string> = CARD_COLORS_TOKENS;

export const BRAND_COLORS = Object.freeze(
  catalogueData.brands.reduce<Record<string, string>>((accumulator, brand) => {
    accumulator[brand.id] = brand.color;
    return accumulator;
  }, {})
);

export const getBrandColor = (brandId: string): string | undefined => BRAND_COLORS[brandId];

/**
 * Light theme colors — Cardi Ink & Beam (Story 21.2). Color members are
 * generated (LIGHT_THEME_COLORS); the non-token `statusBar` literal is appended
 * here so it stays out of the portable token JSON.
 */
export const LIGHT_THEME = {
  ...LIGHT_THEME_COLORS,
  statusBar: 'dark' as const
} as const;

/**
 * Dark theme colors (OLED optimized) — Cardi Ink & Beam (Story 21.2).
 */
export const DARK_THEME = {
  ...DARK_THEME_COLORS,
  statusBar: 'light' as const
} as const;

/**
 * Theme type for use in components
 */
export type Theme = typeof LIGHT_THEME | typeof DARK_THEME;

/**
 * Barcode Flash overlay colors (high contrast for scanning).
 *
 * Deliberately hardcoded and deliberately NOT migrated with the rest of the
 * palette in Story 21.2: the barcode modal ignores dark mode by design and
 * renders a pure-white field with true-black bars whatever the theme says, so
 * routing it through a theme token would be a bug waiting for someone to
 * "consistency-fix" it. See docs/design/cardi/cardi-design-system.md
 * ("Barcode view (the hero moment)").
 */
export const BARCODE_FLASH = {
  background: '#FFFFFF',
  foreground: '#000000'
} as const;
