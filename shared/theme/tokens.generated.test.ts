/**
 * Parity guard for the generated design-token primitives (Story 16.4).
 *
 * The values below are the canonical token values as they existed hand-authored
 * in `colors.ts` / `spacing.ts` before Style Dictionary owned them. This test
 * fails loudly if a regeneration (or a stray hand-edit of `tokens.generated.ts`)
 * ever changes a primitive value — i.e. it enforces the "byte-stable exports"
 * acceptance criterion at the value level. The DTCG JSON under `tokens/` is the
 * source; run `yarn tokens:build` to regenerate.
 */
import {
  CARD_COLORS,
  DARK_THEME_COLORS,
  LAYOUT,
  LIGHT_THEME_COLORS,
  NEUTRAL_COLORS,
  PRIMARY_COLORS,
  SPACING,
  TOUCH_TARGET
} from './tokens.generated';

describe('generated design tokens — parity with canonical values (Story 16.4)', () => {
  it('PRIMARY_COLORS matches the Material-style blue ramp', () => {
    expect(PRIMARY_COLORS).toEqual({
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
    });
  });

  it('CARD_COLORS matches the 5-color virtual-logo palette', () => {
    expect(CARD_COLORS).toEqual({
      blue: '#1A73E8',
      red: '#E2231A',
      green: '#16A34A',
      orange: '#F59E0B',
      grey: '#64748B'
    });
  });

  it('NEUTRAL_COLORS matches the slate ramp', () => {
    expect(NEUTRAL_COLORS).toEqual({
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
    });
  });

  it('LIGHT_THEME_COLORS matches the Figma light theme (color members only, no statusBar)', () => {
    expect(LIGHT_THEME_COLORS).toEqual({
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
      link: '#1A73E8'
    });
  });

  it('DARK_THEME_COLORS matches the OLED dark theme (color members only, no statusBar)', () => {
    expect(DARK_THEME_COLORS).toEqual({
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
      link: '#4DA3FF'
    });
  });

  it('SPACING matches the 8px base grid', () => {
    expect(SPACING).toEqual({ xs: 4, sm: 8, smMd: 12, md: 16, lg: 24, xl: 32, xxl: 48 });
  });

  it('LAYOUT matches the layout constants (cardAspectRatio is exactly 4 / 3)', () => {
    expect(LAYOUT).toEqual({
      screenHorizontalMargin: 24,
      contentPadding: 24,
      gridGutter: 12,
      cardAspectRatio: 4 / 3,
      safeAreaTopInsetMin: 16,
      safeAreaBottomInsetMin: 16
    });
    expect(LAYOUT.cardAspectRatio).toBe(4 / 3);
  });

  it('TOUCH_TARGET matches the accessibility minimums', () => {
    expect(TOUCH_TARGET).toEqual({ min: 44, watch: 32 });
  });
});
