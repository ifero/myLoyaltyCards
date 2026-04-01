/**
 * Theme Module Exports
 * Story 1.2: Design System Foundation
 */

export { SPACING, LAYOUT, TOUCH_TARGET, TAILWIND_SPACING, TAILWIND_TOUCH_TARGET } from './spacing';
export {
  PRIMARY_COLORS,
  CARD_COLORS,
  NEUTRAL_COLORS,
  BRAND_COLORS,
  getBrandColor,
  LIGHT_THEME,
  DARK_THEME,
  SEMANTIC_COLORS,
  BARCODE_FLASH,
  TAILWIND_BACKGROUND_COLORS,
  TAILWIND_SURFACE_COLORS,
  TAILWIND_TEXT_COLORS,
  TAILWIND_BORDER_COLORS
} from './colors';
export { TYPOGRAPHY, TAILWIND_FONT_SIZE } from './typography';
export type { Theme } from './colors';
export { ThemeProvider, useTheme } from './ThemeProvider';
