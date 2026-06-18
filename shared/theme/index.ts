/**
 * Theme Module Exports
 * Story 1.2: Design System Foundation
 */

export { SPACING, LAYOUT, TOUCH_TARGET } from './spacing';
export {
  PRIMARY_COLORS,
  CARD_COLORS,
  NEUTRAL_COLORS,
  BRAND_COLORS,
  getBrandColor,
  LIGHT_THEME,
  DARK_THEME,
  SEMANTIC_COLORS,
  BARCODE_FLASH
} from './colors';
export { TYPOGRAPHY } from './typography';
export type { Theme } from './colors';
export { ThemeProvider, useTheme } from './ThemeProvider';
