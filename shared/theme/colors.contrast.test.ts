import { DARK_THEME, IDENTITY_COLORS, LIGHT_THEME, NEUTRAL_COLORS } from './colors';

const AA_TEXT = 4.5;

const hexToRgb = (hexColor: string) => {
  const cleaned = hexColor.replace('#', '');
  const value =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : cleaned;

  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);

  return { red, green, blue };
};

const linearize = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
};

const luminance = (hexColor: string) => {
  const { red, green, blue } = hexToRgb(hexColor);
  const r = linearize(red);
  const g = linearize(green);
  const b = linearize(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (foregroundHex: string, backgroundHex: string) => {
  const l1 = luminance(foregroundHex);
  const l2 = luminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('Theme contrast compliance', () => {
  it('meets AA contrast for primary text on light and dark backgrounds (>= 4.5)', () => {
    expect(contrastRatio(LIGHT_THEME.textPrimary, LIGHT_THEME.background)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(DARK_THEME.textPrimary, DARK_THEME.background)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  it('meets AA contrast for secondary text on light and dark backgrounds (>= 4.5)', () => {
    expect(contrastRatio(LIGHT_THEME.textSecondary, LIGHT_THEME.background)).toBeGreaterThanOrEqual(
      4.5
    );
    expect(contrastRatio(DARK_THEME.textSecondary, DARK_THEME.background)).toBeGreaterThanOrEqual(
      4.5
    );
  });

  /**
   * `textTertiary` was never asserted here, and it is not decoration: it is the
   * `placeholderTextColor` of every text input in the app (`TextField`,
   * `SearchBar`, `BrandSearchBar`, the OTP field) plus empty-state subtitles,
   * the barcode hint and the single-card tip. None of that qualifies for the
   * WCAG "large text" 3:1 exemption, so it is held to AA against every ground a
   * FIELD uses. `backgroundSubtle` is deliberately absent, but only just: its
   * two field consumers are genuinely inactive — `TextField`'s `disabled` branch
   * (`editable={!disabled}`) and `VerifyEmailScreen`'s `loading` branch
   * (`editable={!loading}`) — which 1.4.3 exempts. It has a third consumer that
   * is NOT inactive, `MultiCodePickerSheet`'s pressed row, and that one is fine
   * on its own numbers rather than by exemption: the text it carries is
   * `textPrimary`/`textSecondary` (14.25 / 5.97 light, 17.02 / 9.44 dark) and
   * the only tertiary thing on it is a chevron icon, which clears the 3:1
   * non-text threshold at 4.36.
   */
  it('meets AA contrast for tertiary text on every active ground (>= 4.5)', () => {
    (['background', 'surface', 'surfaceElevated'] as const).forEach((ground) => {
      expect(contrastRatio(LIGHT_THEME.textTertiary, LIGHT_THEME[ground])).toBeGreaterThanOrEqual(
        4.5
      );
      expect(contrastRatio(DARK_THEME.textTertiary, DARK_THEME[ground])).toBeGreaterThanOrEqual(
        4.5
      );
    });
  });

  it('keeps the text ramp ordered — primary is stronger than secondary is stronger than tertiary', () => {
    [LIGHT_THEME, DARK_THEME].forEach((theme) => {
      const onGround = (color: string) => contrastRatio(color, theme.background);
      expect(onGround(theme.textPrimary)).toBeGreaterThan(onGround(theme.textSecondary));
      expect(onGround(theme.textSecondary)).toBeGreaterThan(onGround(theme.textTertiary));
    });
  });

  it('meets minimum UI contrast for primary interactive color on backgrounds (>= 3)', () => {
    expect(contrastRatio(LIGHT_THEME.primary, LIGHT_THEME.background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(DARK_THEME.primary, DARK_THEME.background)).toBeGreaterThanOrEqual(3);
  });
});

/**
 * The beam rule (Story 21.2, AC6).
 *
 * `cardi-design-system.md` states it as prose — beam "always pair[s] with ink
 * text (`#181824`), never white" — and prose does not fail a build. Beam is a
 * high-luminance yellow, so white on it is barely over 1.5:1: the kind of
 * defect that looks *brighter* in a screenshot and is unreadable in daylight.
 * Dark mode makes beam the fill of every primary action, which is exactly where
 * a hardcoded white label would land, so the rule needs teeth in both
 * directions — the failing case is asserted as failing on purpose. If a future
 * palette edit ever makes white-on-beam pass, beam has been lightened or
 * muddied and that test SHOULD go red.
 */
describe('The beam rule — text on beam is ink, never white', () => {
  it('ink on beam meets AA for body text', () => {
    expect(contrastRatio(IDENTITY_COLORS.ink, IDENTITY_COLORS.beam)).toBeGreaterThanOrEqual(
      AA_TEXT
    );
  });

  it('white on beam fails AA, so the rule has teeth', () => {
    expect(contrastRatio(NEUTRAL_COLORS.white, IDENTITY_COLORS.beam)).toBeLessThan(AA_TEXT);
  });

  it('the dark primary action is beam carrying ink, and it is legible', () => {
    expect(DARK_THEME.primary).toBe(IDENTITY_COLORS.beam);
    expect(DARK_THEME.onPrimary).toBe(IDENTITY_COLORS.ink);
    expect(contrastRatio(DARK_THEME.onPrimary, DARK_THEME.primary)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('the light primary action is ink carrying white, and it is legible', () => {
    expect(LIGHT_THEME.primary).toBe(IDENTITY_COLORS.ink);
    expect(LIGHT_THEME.onPrimary).toBe(NEUTRAL_COLORS.white);
    expect(contrastRatio(LIGHT_THEME.onPrimary, LIGHT_THEME.primary)).toBeGreaterThanOrEqual(
      AA_TEXT
    );
  });

  /**
   * `error` carries text in a dozen places AND fills a handful of buttons, and
   * the two want opposite labels once dark mode lifts the red far enough to read
   * on black: white then sits at 3.41:1 on it. That is the same shape as the
   * beam trap — a token that is safe as a foreground being assumed safe as a
   * field — so it gets the same guard rather than a comment.
   */
  it('the error fill carries onError, and white would not do in dark', () => {
    expect(contrastRatio(LIGHT_THEME.onError, LIGHT_THEME.error)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(DARK_THEME.onError, DARK_THEME.error)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(NEUTRAL_COLORS.white, DARK_THEME.error)).toBeLessThan(AA_TEXT);
  });

  it('error text stays legible on every ground it is drawn on', () => {
    expect(contrastRatio(LIGHT_THEME.error, LIGHT_THEME.background)).toBeGreaterThanOrEqual(
      AA_TEXT
    );
    expect(contrastRatio(LIGHT_THEME.error, LIGHT_THEME.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(DARK_THEME.error, DARK_THEME.background)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(DARK_THEME.error, DARK_THEME.surface)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  /**
   * Which roles are beam is a decision, so it is written down rather than
   * implied. Light has NONE on purpose: beam is 1.33:1 on cream and 1.52:1 on
   * white, so it can be a field that carries ink but never a mark drawn on a
   * light ground. Dark gives it the roles that ask for an action. Adding a role
   * here should be a deliberate act, not a side effect of editing a hex.
   */
  it('names exactly the roles that resolve to beam, in each theme', () => {
    const beamRoles = (theme: typeof LIGHT_THEME | typeof DARK_THEME) =>
      Object.entries(theme)
        .filter(([, value]) => value === IDENTITY_COLORS.beam)
        .map(([role]) => role)
        .sort();

    expect(beamRoles(LIGHT_THEME)).toEqual([]);
    expect(beamRoles(DARK_THEME)).toEqual(['link', 'primary', 'warning']);
  });
});
