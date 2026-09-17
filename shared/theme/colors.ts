/**
 * Color Constants
 * Story 13.1: Implement Design System Tokens & Components
 * Story 21.2: Migrate the colour tokens to Ink & Beam
 * Story 21.2a: Migrate the card accents (the five CARD_COLORS keys are frozen)
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
 * Card color type - matches core/schemas/card.ts CardColor.
 * Duplicated here to keep this token module dependency-free.
 *
 * ⛔ These five are FROZEN IDENTIFIERS, not colour names (Story 21.2a, AC1) — the
 * canonical statement of why, and of which two are deliberately misnamed, lives on
 * `CARD_COLOR_KEYS` in core/schemas/card.ts. Keep this union in step with that one;
 * never rename a member on either side.
 */
type CardColor = 'blue' | 'red' | 'green' | 'orange' | 'grey';

/**
 * 5-color card palette for Virtual Logo system
 * Used when cards don't have official logos
 */
export const CARD_COLORS: Record<CardColor, string> = CARD_COLORS_TOKENS;

/**
 * Hex for the accent a card falls back to when its colour cannot be resolved.
 *
 * The hex half of `DEFAULT_CARD_COLOR` (core/schemas/card.ts), which holds the key.
 * Every `?? CARD_COLORS.grey` in the app was replaced by this, because the key stopped
 * describing its colour when Story 21.2a repainted `grey` to the azure #0C84CC: a
 * reader of `?? CARD_COLORS.grey` would have had to know the freeze to know that the
 * fallback is not grey.
 *
 * The key is repeated here rather than imported, for the same reason `CardColor` above
 * is: importing core/schemas/card would pull zod into this token module. The repetition
 * cannot drift — `core/wear-sync-contract.test.ts` asserts it equals `DEFAULT_CARD_COLOR`
 * and that this union matches `CARD_COLOR_KEYS`, and the hex is derived from the token
 * rather than written out.
 */
const DEFAULT_CARD_COLOR_KEY: CardColor = 'grey';

export const DEFAULT_CARD_COLOR_HEX: string = CARD_COLORS_TOKENS[DEFAULT_CARD_COLOR_KEY];

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
