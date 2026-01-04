/**
 * Spacing and Layout Constants
 * Story 1.2: Implement Design System Foundation
 *
 * This file contains spacing and touch target tokens for the myLoyaltyCards app.
 * - 8px base grid spacing
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
 * Tailwind-compatible 8px base grid spacing
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_SPACING = {
  '0.5': '4px',
  '1': '8px',
  '1.5': '12px',
  '2': '16px',
  '2.5': '20px',
  '3': '24px',
  '3.5': '28px',
  '4': '32px',
  '4.5': '36px',
  '5': '40px',
  '5.5': `${TOUCH_TARGET.min}px`, // Minimum touch target
  '6': '48px',
  '7': '56px',
  '8': '64px',
  '9': '72px',
  '10': '80px',
} as const;

/**
 * Tailwind-compatible touch target sizes
 * Used in tailwind.config.js to avoid duplication
 */
export const TAILWIND_TOUCH_TARGET = {
  touch: `${TOUCH_TARGET.min}px`,
} as const;
