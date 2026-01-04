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
