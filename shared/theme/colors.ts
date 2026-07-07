/**
 * Color Constants
 * Story 13.1: Implement Design System Tokens & Components
 *
 * Primitive color records (PRIMARY_COLORS, CARD_COLORS, NEUTRAL_COLORS, and the
 * per-theme color maps) are generated from the DTCG token JSON under `tokens/`
 * via Style Dictionary — see `tokens.generated.ts` (Story 16.4). Edit the JSON
 * and run `yarn tokens:build` to change a value. The catalogue-runtime brand
 * map, the non-token `statusBar` literal, and the derived SEMANTIC_COLORS /
 * BARCODE_FLASH values stay hand-authored here.
 */
import {
  CARD_COLORS as CARD_COLORS_TOKENS,
  DARK_THEME_COLORS,
  LIGHT_THEME_COLORS,
  NEUTRAL_COLORS,
  PRIMARY_COLORS
} from './tokens.generated';
import catalogueData from '../../catalogue/italy.json';

export { NEUTRAL_COLORS, PRIMARY_COLORS };

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
 * Light theme colors — aligned with Figma (Story 12-2). Color members are
 * generated (LIGHT_THEME_COLORS); the non-token `statusBar` literal is appended
 * here so it stays out of the portable token JSON.
 */
export const LIGHT_THEME = {
  ...LIGHT_THEME_COLORS,
  statusBar: 'dark' as const
} as const;

/**
 * Dark theme colors (OLED optimized) — aligned with Figma (Story 12-2).
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
 * Common semantic colors (same in both themes)
 */
export const SEMANTIC_COLORS = {
  success: LIGHT_THEME.success,
  error: LIGHT_THEME.error,
  warning: LIGHT_THEME.warning,
  info: LIGHT_THEME.info
} as const;

/**
 * Barcode Flash overlay colors (high contrast for scanning)
 */
export const BARCODE_FLASH = {
  background: '#FFFFFF',
  foreground: '#000000'
} as const;
