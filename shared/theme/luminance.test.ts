/**
 * Luminance Utility Tests
 * Shared color contrast calculation for brand-colored headers and hero sections.
 */

import { getContrastForeground, getFavouriteStarColor, getLuminance } from './luminance';
import { IDENTITY_COLORS } from './tokens.generated';

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

  it('returns ink for light backgrounds', () => {
    expect(getContrastForeground('#FFFFFF')).toBe(IDENTITY_COLORS.ink);
    expect(getContrastForeground('#F5F5F5')).toBe(IDENTITY_COLORS.ink);
    expect(getContrastForeground('#E0E0E0')).toBe(IDENTITY_COLORS.ink);
  });

  it('handles a dark brand blue (Carrefour #004E9F)', () => {
    // Luminance ≈0.08 — the same order as ink, so the foreground flips to white.
    expect(getContrastForeground('#004E9F')).toBe('#FFFFFF');
  });

  it('handles gold/yellow colors', () => {
    // Esselunga #FFCC00 — high luminance → ink text
    expect(getContrastForeground('#FFCC00')).toBe(IDENTITY_COLORS.ink);
  });

  // Story 21.2 retired `#1F1F24` — the pre-rebrand textPrimary, which no
  // palette holds any more. Asserting its absence is cheaper than re-reading
  // every call site the next time someone copies an old hex in.
  it('never returns the retired pre-rebrand dark', () => {
    ['#FFFFFF', '#000000', '#FFCC00', '#004E9F', '#E2231A'].forEach((background) => {
      expect(getContrastForeground(background)).not.toBe('#1F1F24');
    });
  });
});

describe('getFavouriteStarColor', () => {
  it('returns beam on dark fields, where the design system wants the only yellow', () => {
    expect(getFavouriteStarColor('#000000')).toBe(IDENTITY_COLORS.beam);
    expect(getFavouriteStarColor(IDENTITY_COLORS.ink)).toBe(IDENTITY_COLORS.beam);
    // Coop red, Carrefour blue, Pam green — all dark enough to carry beam.
    expect(getFavouriteStarColor('#E2231A')).toBe(IDENTITY_COLORS.beam);
    expect(getFavouriteStarColor('#004E9F')).toBe(IDENTITY_COLORS.beam);
    expect(getFavouriteStarColor('#165226')).toBe(IDENTITY_COLORS.beam);
  });

  it('falls back to ink on light fields, so an Esselunga star does not vanish', () => {
    // Esselunga #FFCC00 is three points from beam and likely the most-used card
    // in the app: a beam star on it is invisible, not subtle.
    expect(getFavouriteStarColor('#FFCC00')).toBe(IDENTITY_COLORS.ink);
    expect(getFavouriteStarColor('#FFFFFF')).toBe(IDENTITY_COLORS.ink);
  });

  it('resolves beam-on-beam to ink, pre-answering the accent Story 21.2a adds', () => {
    expect(getFavouriteStarColor(IDENTITY_COLORS.beam)).toBe(IDENTITY_COLORS.ink);
  });

  it('never returns the same colour as the field it is drawn on', () => {
    [IDENTITY_COLORS.beam, IDENTITY_COLORS.ink, '#FFCC00', '#000000', '#FFFFFF'].forEach(
      (field) => {
        expect(getFavouriteStarColor(field)).not.toBe(field);
      }
    );
  });
});
