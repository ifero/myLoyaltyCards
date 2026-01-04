/**
 * Theme Module Exports
 * Story 1.2: Design System Foundation
 */

export { SPACING, TOUCH_TARGET, TAILWIND_SPACING, TAILWIND_TOUCH_TARGET } from './spacing';
export {
  SAGE_COLORS,
  CARD_COLORS,
  CARD_COLOR_KEYS,
  OLED_COLORS,
  OFFWHITE_COLORS,
  LIGHT_THEME,
  DARK_THEME,
  SEMANTIC_COLORS,
  BARCODE_FLASH,
  TAILWIND_BACKGROUND_COLORS,
  TAILWIND_SURFACE_COLORS,
  TAILWIND_TEXT_COLORS,
} from './colors';
export type { CardColorKey, Theme } from './colors';
export { ThemeProvider, useTheme } from './ThemeProvider';
