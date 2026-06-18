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
