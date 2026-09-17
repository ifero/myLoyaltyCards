/**
 * Parity guard for the generated design-token primitives (Story 16.4).
 *
 * The values below are the canonical token values as they exist in the DTCG
 * JSON under `tokens/`. This test fails loudly if a regeneration (or a stray
 * hand-edit of `tokens.generated.ts`) ever changes a primitive value — i.e. it
 * enforces the "byte-stable exports" acceptance criterion at the value level.
 * Run `yarn tokens:build` to regenerate the source of these values.
 *
 * Story 21.2 replaced the Google-Blue-derived palette with Cardì Ink & Beam,
 * retired the `PRIMARY_COLORS` ramp (no consumers, no Cardì successor) and
 * added `IDENTITY_COLORS` coverage, which this guard never had.
 */
import {
  CARD_COLORS,
  DARK_THEME_COLORS,
  IDENTITY_COLORS,
  LAYOUT,
  LIGHT_THEME_COLORS,
  NEUTRAL_COLORS,
  SPACING,
  TOUCH_TARGET
} from './tokens.generated';

describe('generated design tokens — parity with canonical values (Story 16.4)', () => {
  it('IDENTITY_COLORS matches the Cardì brand triple', () => {
    expect(IDENTITY_COLORS).toEqual({
      ink: '#181824',
      beam: '#FCCC0C',
      cream: '#F0F0E8'
    });
  });

  // ⛔ The KEYS are a frozen wire/storage contract — see CARD_COLOR_KEYS in
  // core/schemas/card.ts. Change a value here when the palette moves; never add,
  // remove or rename a key. Two are deliberately misnamed: `orange` is the beam
  // yellow and `grey` is the azure.
  it('CARD_COLORS matches the five Cardì card accents (Story 21.2a)', () => {
    expect(CARD_COLORS).toEqual({
      blue: '#0C3C84',
      red: '#E42424',
      green: '#0C843C',
      orange: '#FCCC0C',
      grey: '#0C84CC'
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

  it('LIGHT_THEME_COLORS matches the Cardì light theme (color members only, no statusBar)', () => {
    expect(LIGHT_THEME_COLORS).toEqual({
      primary: '#181824',
      primaryDark: '#2A2A3A',
      onPrimary: '#FFFFFF',
      background: '#F0F0E8',
      backgroundSubtle: '#E8E8DE',
      surface: '#FFFFFF',
      surfaceElevated: '#F7F7F1',
      textPrimary: '#181824',
      textSecondary: '#55555F',
      textTertiary: '#6B6B63',
      border: '#D6D6CB',
      borderStrong: '#9A9A93',
      success: '#181824',
      warning: '#181824',
      error: '#C41E1E',
      onError: '#FFFFFF',
      info: '#181824',
      link: '#181824'
    });
  });

  it('DARK_THEME_COLORS matches the Cardì OLED dark theme (color members only, no statusBar)', () => {
    expect(DARK_THEME_COLORS).toEqual({
      primary: '#FCCC0C',
      primaryDark: '#F0F0E8',
      onPrimary: '#181824',
      background: '#000000',
      backgroundSubtle: '#0C0C12',
      surface: '#181824',
      surfaceElevated: '#20202E',
      textPrimary: '#F0F0E8',
      textSecondary: '#B5B5AB',
      textTertiary: '#8F8F85',
      border: '#3A3A48',
      borderStrong: '#55555F',
      success: '#F0F0E8',
      warning: '#FCCC0C',
      error: '#FF453A',
      onError: '#181824',
      info: '#F0F0E8',
      link: '#FCCC0C'
    });
  });

  // The whole point of Story 21.2 is that the identity stopped being a parallel
  // truth. These bind the three brand values to the theme roles that carry them,
  // so a future edit cannot quietly reintroduce a second palette.
  it('the theme roles are derived from the identity triple, not from a second palette', () => {
    expect(LIGHT_THEME_COLORS.primary).toBe(IDENTITY_COLORS.ink);
    expect(LIGHT_THEME_COLORS.textPrimary).toBe(IDENTITY_COLORS.ink);
    expect(LIGHT_THEME_COLORS.background).toBe(IDENTITY_COLORS.cream);
    expect(DARK_THEME_COLORS.primary).toBe(IDENTITY_COLORS.beam);
    expect(DARK_THEME_COLORS.onPrimary).toBe(IDENTITY_COLORS.ink);
    expect(DARK_THEME_COLORS.surface).toBe(IDENTITY_COLORS.ink);
    expect(DARK_THEME_COLORS.textPrimary).toBe(IDENTITY_COLORS.cream);
  });

  // Alpha is applied at several call sites by string concatenation
  // (`theme.primary + '14'`, `${theme.error}1A`, a local `withAlpha` helper). An
  // 8-digit hex or an `rgba()` string in any token value silently produces an
  // invalid colour at every one of them, so the shape is a contract.
  it('every theme value is a 6-digit hex, so alpha concatenation stays valid', () => {
    const values = [
      ...Object.values(IDENTITY_COLORS),
      ...Object.values(CARD_COLORS),
      ...Object.values(NEUTRAL_COLORS),
      ...Object.values(LIGHT_THEME_COLORS),
      ...Object.values(DARK_THEME_COLORS)
    ];

    values.forEach((value) => expect(value).toMatch(/^#[0-9A-F]{6}$/));
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
