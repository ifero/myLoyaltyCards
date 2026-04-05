/**
 * Luminance Utility Tests
 * Shared color contrast calculation for brand-colored headers and hero sections.
 */

import { getLuminance, getContrastForeground } from './luminance';

describe('getLuminance', () => {
  it('returns 0 for pure black', () => {
    expect(getLuminance('#000000')).toBe(0);
  });

  it('returns ~1 for pure white', () => {
    expect(getLuminance('#FFFFFF')).toBeCloseTo(1, 1);
  });

  it('handles hex without # prefix', () => {
    expect(getLuminance('000000')).toBe(0);
  });

  it('returns correct luminance for a mid-tone color', () => {
    // #808080 → each channel = 128/255 ≈ 0.502
    const result = getLuminance('#808080');
    expect(result).toBeGreaterThan(0.3);
    expect(result).toBeLessThan(0.7);
  });

  it('returns higher luminance for light colors', () => {
    const light = getLuminance('#E0E0E0');
    const dark = getLuminance('#202020');
    expect(light).toBeGreaterThan(dark);
  });

  it('handles brand color (Conad red)', () => {
    const result = getLuminance('#E2231A');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(0.5);
  });
});

describe('getContrastForeground', () => {
  it('returns white for dark backgrounds', () => {
    expect(getContrastForeground('#000000')).toBe('#FFFFFF');
    expect(getContrastForeground('#1A1A1A')).toBe('#FFFFFF');
    expect(getContrastForeground('#E2231A')).toBe('#FFFFFF');
  });

  it('returns dark for light backgrounds', () => {
    expect(getContrastForeground('#FFFFFF')).toBe('#1F1F24');
    expect(getContrastForeground('#F5F5F5')).toBe('#1F1F24');
    expect(getContrastForeground('#E0E0E0')).toBe('#1F1F24');
  });

  it('handles primary blue (#1A73E8)', () => {
    // Blue has moderate luminance, should return white
    expect(getContrastForeground('#1A73E8')).toBe('#FFFFFF');
  });

  it('handles gold/yellow colors', () => {
    // #F59E0B — amber/gold, high luminance → dark text
    expect(getContrastForeground('#F59E0B')).toBe('#1F1F24');
  });
});
