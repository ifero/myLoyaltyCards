/**
 * Map HEX color to CardColor
 * Story 3.3: Brand color mapping utility
 *
 * Maps brand HEX colors to the closest CardColor from the 5-color palette.
 */

import { CardColor } from '@/core/schemas/card';

/**
 * Convert HEX to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Simple heuristic to map HEX to closest CardColor
 * Uses RGB channel dominance and brightness
 */
export function mapHexToCardColor(hex: string): CardColor {
  const rgb = hexToRgb(hex);
  
  if (!rgb) {
    return 'grey'; // Fallback for invalid hex
  }

  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;

  // Low saturation or very dark/light → grey
  if (max - min < 30 || brightness < 40 || brightness > 220) {
    return 'grey';
  }

  // Yellow/Orange (high red + green, low blue) - check before pure red
  if (r > 150 && g > 80 && b < 120 && r > b + 50) {
    return 'orange';
  }

  // Red dominant
  if (r === max && r > g + 30) {
    return 'red';
  }

  // Green dominant
  if (g === max && g > r + 30) {
    return 'green';
  }

  // Blue dominant
  if (b === max) {
    return 'blue';
  }

  // Default fallback
  return 'blue';
}
