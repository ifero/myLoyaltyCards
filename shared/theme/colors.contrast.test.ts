import { DARK_THEME, LIGHT_THEME } from './colors';

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

  it('meets minimum UI contrast for primary interactive color on backgrounds (>= 3)', () => {
    expect(contrastRatio(LIGHT_THEME.primary, LIGHT_THEME.background)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(DARK_THEME.primary, DARK_THEME.background)).toBeGreaterThanOrEqual(3);
  });
});
