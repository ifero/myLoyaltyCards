/**
 * Theme Module Exports
 * Story 1.2: Design System Foundation
 */

export { SPACING, LAYOUT, TOUCH_TARGET } from './spacing';
export {
  CARD_COLORS,
  NEUTRAL_COLORS,
  // OURS (Cardi ink/beam/cream). BRAND_COLORS below is the 57 RETAILER brands.
  IDENTITY_COLORS,
  BRAND_COLORS,
  getBrandColor,
  LIGHT_THEME,
  DARK_THEME,
  BARCODE_FLASH
} from './colors';
export { TYPOGRAPHY } from './typography';
export type { Theme } from './colors';
export { ThemeProvider, useTheme } from './ThemeProvider';
