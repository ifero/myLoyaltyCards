import {
  CHROME_TIER,
  FONT_FAMILY,
  MONOGRAM_TEXT_PROPS,
  NAVIGATION_TITLE_FONT,
  TYPOGRAPHY,
  emToPoints,
  inputFont,
  monogram,
  type FontWeight
} from './typography';

describe('emToPoints — tracking is CONVERTED, not copied (Story 21.6 AC6)', () => {
  it('resolves display-lg −0.03em at 34px to −1.02pt', () => {
    expect(emToPoints(-0.03, 34)).toBe(-1.02);
  });

  it.each([
    [-0.01, 24, -0.24],
    [0.02, 13, 0.26],
    [0.05, 12, 0.6],
    [8 / 22, 22, 8],
    [0, 17, 0]
  ])('resolves %sem at %ipx to %spt', (em, fontSize, points) => {
    expect(emToPoints(em, fontSize)).toBe(points);
  });

  it('never yields negative zero, which would make a zero-tracking token unequal to 0', () => {
    expect(Object.is(emToPoints(-0, 17), 0)).toBe(true);
  });
});

describe('TYPOGRAPHY — the Cardì scale (Story 21.6 AC5)', () => {
  it('matches the design system and the drawn frames, token by token', () => {
    const display = FONT_FAMILY.display;
    const text = FONT_FAMILY.text;
    const mono = FONT_FAMILY.mono;

    expect(TYPOGRAPHY).toEqual({
      displayLg: {
        fontFamily: display,
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '700',
        letterSpacing: -1.02
      },
      headlineMd: {
        fontFamily: display,
        fontSize: 24,
        lineHeight: 32,
        fontWeight: '700',
        letterSpacing: -0.24
      },
      sheetTitle: {
        fontFamily: display,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '700',
        letterSpacing: 0
      },
      headlineSm: {
        fontFamily: text,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: '700',
        letterSpacing: 0
      },
      bodyLg: {
        fontFamily: text,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '400',
        letterSpacing: 0
      },
      bodyLgStrong: {
        fontFamily: text,
        fontSize: 17,
        lineHeight: 24,
        fontWeight: '600',
        letterSpacing: 0
      },
      bodyMd: {
        fontFamily: text,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
        letterSpacing: 0
      },
      bodyMdStrong: {
        fontFamily: text,
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '600',
        letterSpacing: 0
      },
      captionLg: {
        fontFamily: text,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
        letterSpacing: 0
      },
      labelBold: {
        fontFamily: text,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
        letterSpacing: 0.26
      },
      captionMd: {
        fontFamily: text,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '400',
        letterSpacing: 0
      },
      overline: {
        fontFamily: text,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '600',
        letterSpacing: 0.6
      },
      captionSm: {
        fontFamily: text,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '400',
        letterSpacing: 0
      },
      monoCode: {
        fontFamily: mono,
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
        letterSpacing: 0
      },
      monoCodeLg: {
        fontFamily: mono,
        fontSize: 22,
        lineHeight: 32,
        fontWeight: '500',
        letterSpacing: 8
      }
    });
  });

  it('spells each family exactly as the face files do, which is the name iOS resolves', () => {
    expect(FONT_FAMILY).toEqual({
      display: 'Space Grotesk',
      text: 'Inter',
      mono: 'JetBrains Mono'
    });
  });

  it('sets display-lg at 700: Space Grotesk has no 800 master, so the design system’s 800 cannot render', () => {
    expect(TYPOGRAPHY.displayLg.fontWeight).toBe('700');
  });

  it('keeps the design system’s 800 representable in the weight union (AC4)', () => {
    const designSystemDisplayWeight: FontWeight = '800';
    // @ts-expect-error — 900 is not a weight any bundled face, or the design system, names.
    const unnamedWeight: FontWeight = '900';

    expect([designSystemDisplayWeight, unnamedWeight]).toEqual(['800', '900']);
  });

  it('puts nothing below the 15px body floor except the named chrome tier (Story 21.2 AC14)', () => {
    const belowFloor = Object.entries(TYPOGRAPHY)
      .filter(([, token]) => token.fontSize < 15)
      .map(([name]) => name)
      .sort();

    expect(belowFloor).toEqual([...CHROME_TIER].sort());
  });

  it('keeps every line box at least as tall as its type', () => {
    for (const token of Object.values(TYPOGRAPHY)) {
      expect(token.lineHeight).toBeGreaterThanOrEqual(token.fontSize);
    }
  });
});

describe('NAVIGATION_TITLE_FONT — the face swap for native header titles', () => {
  it('takes body-lg-strong’s face and weight', () => {
    expect(NAVIGATION_TITLE_FONT).toEqual({ fontFamily: 'Inter', fontWeight: '600' });
  });

  it('sets no size, so each platform keeps its native header title size', () => {
    expect(NAVIGATION_TITLE_FONT).not.toHaveProperty('fontSize');
  });
});

describe('inputFont — a token for a single-line TextInput', () => {
  it('keeps the face, size, weight and tracking', () => {
    expect(inputFont(TYPOGRAPHY.monoCodeLg)).toEqual({
      fontFamily: 'JetBrains Mono',
      fontSize: 22,
      fontWeight: '500',
      letterSpacing: 8
    });
  });

  it('drops the line height, so the field’s own height sets the line', () => {
    expect(inputFont(TYPOGRAPHY.bodyLg)).not.toHaveProperty('lineHeight');
  });
});

describe('monogram — initials sized to their container, not text on the scale', () => {
  it('takes the display face at bold and the size it is given', () => {
    expect(monogram(28)).toEqual({ fontFamily: 'Space Grotesk', fontWeight: '700', fontSize: 28 });
  });

  it('sets no line height, so the natural line box keeps a capital optically centred', () => {
    expect(monogram(18)).not.toHaveProperty('lineHeight');
  });

  it('opts its Text out of Dynamic Type, as an icon is — the container does not grow', () => {
    expect(MONOGRAM_TEXT_PROPS).toEqual({ allowFontScaling: false });
  });
});
