export type TypographyTokenName =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subheadline'
  | 'footnote'
  | 'caption1'
  | 'caption2';

type TypographyToken = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeight: '400' | '500' | '600' | '700';
};

export const TYPOGRAPHY: Record<TypographyTokenName, TypographyToken> = {
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: 0.37, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: 0.36, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: 0.35, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: 0.38, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.32, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, letterSpacing: 0, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, letterSpacing: 0.07, fontWeight: '400' }
} as const;

export const TAILWIND_FONT_SIZE = {
  'large-title': [
    `${TYPOGRAPHY.largeTitle.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.largeTitle.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.largeTitle.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.largeTitle.fontWeight
    }
  ],
  title1: [
    `${TYPOGRAPHY.title1.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.title1.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.title1.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.title1.fontWeight
    }
  ],
  title2: [
    `${TYPOGRAPHY.title2.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.title2.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.title2.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.title2.fontWeight
    }
  ],
  title3: [
    `${TYPOGRAPHY.title3.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.title3.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.title3.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.title3.fontWeight
    }
  ],
  headline: [
    `${TYPOGRAPHY.headline.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.headline.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.headline.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.headline.fontWeight
    }
  ],
  body: [
    `${TYPOGRAPHY.body.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.body.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.body.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.body.fontWeight
    }
  ],
  callout: [
    `${TYPOGRAPHY.callout.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.callout.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.callout.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.callout.fontWeight
    }
  ],
  subheadline: [
    `${TYPOGRAPHY.subheadline.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.subheadline.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.subheadline.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.subheadline.fontWeight
    }
  ],
  footnote: [
    `${TYPOGRAPHY.footnote.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.footnote.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.footnote.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.footnote.fontWeight
    }
  ],
  caption1: [
    `${TYPOGRAPHY.caption1.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.caption1.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.caption1.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.caption1.fontWeight
    }
  ],
  caption2: [
    `${TYPOGRAPHY.caption2.fontSize}px`,
    {
      lineHeight: `${TYPOGRAPHY.caption2.lineHeight}px`,
      letterSpacing: `${TYPOGRAPHY.caption2.letterSpacing}px`,
      fontWeight: TYPOGRAPHY.caption2.fontWeight
    }
  ]
} as const;
