/**
 * Color Constants
 * Story 13.1: Implement Design System Tokens & Components
 */

import catalogueData from '../../catalogue/italy.json';

/**
 * Card color type - matches core/schemas/card.ts CardColor
 * Duplicated here to avoid circular dependency with Tailwind config
 */
type CardColor = 'blue' | 'red' | 'green' | 'orange' | 'grey';

export const PRIMARY_COLORS = {
  50: '#E8F1FE',
  100: '#D2E3FC',
  200: '#AECBFA',
  300: '#8AB4F8',
  400: '#669DF6',
  500: '#1A73E8',
  600: '#1967D2',
  700: '#185ABC',
  800: '#174EA6',
  900: '#163A7A'
} as const;

/**
 * 5-color card palette for Virtual Logo system
 * Used when cards don't have official logos
 */
export const CARD_COLORS: Record<CardColor, string> = {
  blue: '#1A73E8',
  red: '#E2231A',
  green: '#16A34A',
  orange: '#F59E0B',
  grey: '#64748B'
} as const;

export const NEUTRAL_COLORS = {
  white: '#FFFFFF',
  black: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0F172A'
} as const;

export const BRAND_COLORS = Object.freeze(
  catalogueData.brands.reduce<Record<string, string>>((accumulator, brand) => {
    accumulator[brand.id] = brand.color;
    return accumulator;
  }, {})
);

export const getBrandColor = (brandId: string): string | undefined => BRAND_COLORS[brandId];

/**
 * Light theme colors — aligned with Figma (Story 12-2)
 */
export const LIGHT_THEME = {
  primary: '#1A73E8',
  primaryDark: '#1967D2',
  background: '#FFFFFF',
  backgroundSubtle: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceElevated: '#F5F5F5',
  textPrimary: '#1F1F24',
  textSecondary: '#66666B',
  textTertiary: '#8F8F94',
  border: '#E5E5EB',
  borderStrong: '#8F8F94',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#1A73E8',
  link: '#1A73E8',
  statusBar: 'dark' as const
} as const;

/**
 * Dark theme colors (OLED optimized) — aligned with Figma (Story 12-2)
 */
export const DARK_THEME = {
  primary: '#4DA3FF',
  primaryDark: '#1A73E8',
  background: '#000000',
  backgroundSubtle: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  textPrimary: '#F5F5F7',
  textSecondary: '#D9D9DE',
  textTertiary: '#99999E',
  border: '#38383A',
  borderStrong: '#636366',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#F87171',
  info: '#4DA3FF',
  link: '#4DA3FF',
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

/**
 * Tailwind-compatible background colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_BACKGROUND_COLORS = {
  light: LIGHT_THEME.background,
  dark: DARK_THEME.background,
  subtleLight: LIGHT_THEME.backgroundSubtle,
  subtleDark: DARK_THEME.backgroundSubtle
} as const;

/**
 * Tailwind-compatible surface colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_SURFACE_COLORS = {
  light: LIGHT_THEME.surface,
  dark: DARK_THEME.surface,
  elevatedLight: LIGHT_THEME.surfaceElevated,
  elevatedDark: DARK_THEME.surfaceElevated
} as const;

/**
 * Tailwind-compatible text colors for theming
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_TEXT_COLORS = {
  primary: {
    light: LIGHT_THEME.textPrimary,
    dark: DARK_THEME.textPrimary
  },
  secondary: {
    light: LIGHT_THEME.textSecondary,
    dark: DARK_THEME.textSecondary
  },
  tertiary: {
    light: LIGHT_THEME.textTertiary,
    dark: DARK_THEME.textTertiary
  }
} as const;

export const TAILWIND_BORDER_COLORS = {
  light: LIGHT_THEME.border,
  dark: DARK_THEME.border,
  strongLight: LIGHT_THEME.borderStrong,
  strongDark: DARK_THEME.borderStrong
} as const;
