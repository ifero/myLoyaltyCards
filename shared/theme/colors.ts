/**
 * Color Constants
 * Story 1.2: Implement Design System Foundation
 *
 * This file contains the color tokens for the myLoyaltyCards app.
 * - Accessible Sage color palette
 * - 5-color card palette
 * - Light/dark mode semantic colors
 */

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
 * OLED Black for dark mode backgrounds
 */
export const OLED_COLORS = {
  black: '#000000',
} as const;

/**
 * Off-white for light mode backgrounds
 */
export const OFFWHITE_COLORS = {
  DEFAULT: '#FAFAFA',
  50: '#FFFFFF',
  100: '#FAFAFA',
  200: '#F5F5F5',
} as const;

/**
 * Light theme colors
 */
export const LIGHT_THEME = {
  background: OFFWHITE_COLORS.DEFAULT,
  surface: OFFWHITE_COLORS[50],
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
  background: OLED_COLORS.black,
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

/**
 * Tailwind-compatible background colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_BACKGROUND_COLORS = {
  light: LIGHT_THEME.background,
  dark: DARK_THEME.background,
} as const;

/**
 * Tailwind-compatible surface colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_SURFACE_COLORS = {
  light: LIGHT_THEME.surface,
  dark: DARK_THEME.surface,
} as const;

/**
 * Tailwind-compatible text colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_TEXT_COLORS = {
  primary: {
    light: LIGHT_THEME.textPrimary,
    dark: DARK_THEME.textPrimary,
  },
  secondary: {
    light: LIGHT_THEME.textSecondary,
    dark: DARK_THEME.textSecondary,
  },
} as const;
