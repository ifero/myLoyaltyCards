/**
 * Luminance Utility
 * Shared color contrast calculation for brand-colored headers and hero sections.
 *
 * Used by:
 * - BrandHero component (card detail hero section)
 * - Card Detail screen (branded navigation header)
 */

/**
 * Calculate relative luminance of a hex color (simplified linear approximation).
 * Sufficient for binary white/black foreground decisions.
 * @param hex - Hex color string (e.g., "#1A73E8" or "1A73E8")
 * @returns Luminance value between 0 (black) and 1 (white)
 */
export const getLuminance = (hex: string): number => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Get a contrast-appropriate foreground color for a given background.
 * Returns white for dark backgrounds, dark for light backgrounds.
 * @param backgroundHex - Background hex color
 * @returns Foreground color hex string
 */
export const getContrastForeground = (backgroundHex: string): string =>
  getLuminance(backgroundHex) < 0.5 ? '#FFFFFF' : '#1F1F24';
