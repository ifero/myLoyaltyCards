/**
 * Design System Constants
 * Story 1.2: Implement Design System Foundation
 *
 * This file contains the core design tokens for the myLoyaltyCards app.
 * - 8px base grid spacing
 * - Accessible Sage color palette
 * - 5-color card palette
 * - Light/dark mode semantic colors
 * - Minimum touch target sizes
 */

/**
 * 8px base grid spacing system
 */
export const SPACING = {
  xs: 4, // 0.5 grid units
  sm: 8, // 1 grid unit
  md: 16, // 2 grid units
  lg: 24, // 3 grid units
  xl: 32, // 4 grid units
  xxl: 48, // 6 grid units
} as const;

/**
 * Minimum touch target size for accessibility (44x44px)
 */
export const TOUCH_TARGET = {
  min: 44,
  watch: 32, // Smaller minimum for watch screens
} as const;

/**
 * Primary Sage Green color palette
 */
export const SAGE_COLORS = {
  50: '#f4f9f4',
  100: '#e8f3e8',
  200: '#c5dfc5',
  300: '#a2cba2',
  400: '#8cbf8c',
  500: '#73A973', // Primary Sage Green
  600: '#5c9a5c',
  700: '#4a7d4a',
  800: '#3a623a',
  900: '#2d4d2d',
} as const;

/**
 * 5-color card palette for Virtual Logo system
 * Used when cards don't have official logos
 */
export const CARD_COLORS = {
  blue: '#3B82F6',
  red: '#EF4444',
  green: '#22C55E',
  orange: '#F97316',
  grey: '#6B7280',
} as const;

/**
 * Card color keys for type safety
 */
export type CardColorKey = keyof typeof CARD_COLORS;

/**
 * Array of card color keys for iteration
 */
export const CARD_COLOR_KEYS: CardColorKey[] = [
  'blue',
  'red',
  'green',
  'orange',
  'grey',
];

/**
 * Light theme colors
 */
export const LIGHT_THEME = {
  background: '#FAFAFA', // Off-white
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  primary: SAGE_COLORS[500],
  primaryDark: SAGE_COLORS[600],
  border: '#E5E7EB',
  statusBar: 'dark' as const,
} as const;

/**
 * Dark theme colors (OLED optimized)
 */
export const DARK_THEME = {
  background: '#000000', // OLED black
  surface: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  primary: SAGE_COLORS[500],
  primaryDark: SAGE_COLORS[400],
  border: '#374151',
  statusBar: 'light' as const,
} as const;

/**
 * Theme type for use in components
 */
export type Theme = typeof LIGHT_THEME | typeof DARK_THEME;

/**
 * Common semantic colors (same in both themes)
 */
export const SEMANTIC_COLORS = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',
} as const;

/**
 * Barcode Flash overlay colors (high contrast for scanning)
 */
export const BARCODE_FLASH = {
  background: '#FFFFFF',
  foreground: '#000000',
} as const;
