/**
 * The Cardì WORDMARK: `Card` in Space Grotesk Bold, converted to outlines, plus
 * the drawn `ì` that replaces the letter.
 *
 * ⚠️ THE MARK AND THE WORDMARK ARE DIFFERENT ARTEFACTS. The icon mark's stem is a
 * BARCODE — three bars — crossed by a 52-unit beam; the wordmark's is a single
 * 12-unit stem under a CONTAINED 24-unit accent that stays inside the letter's own
 * advance. `docs/design/cardi/cardi-design-system.md` states the rule the two
 * share: "the stem varies with available space (single inside the word, barcode
 * inside the mark), because the beam is what joins them." Every number below is
 * `docs/design/cardi/tools/mark_locked.py` — the generator of record for the
 * locked mark, gated by `yarn frames:check` — rather than a second set that
 * happens to look the same.
 *
 * ⛔ THE ACCENT DESCENDS. `rotate(35)` is a grave and spells Cardì; `rotate(-35)`
 * rises and spells a different word. SVG's y-axis points down, so the POSITIVE
 * angle is the correct one. Every exploration sheet in `docs/design/cardi/frames/`
 * was drawn wrong until 2026-08-25. The angle is a parameter here rather than a
 * literal precisely so it comes from the one place that owns it.
 *
 * ⚠️ `vertical-align: -0.30em` DOES NOT APPLY HERE, and copying it in would do
 * nothing. That correction exists because an inline `<svg>` in a line of HTML
 * aligns its box bottom to the text baseline; it is a CSS property with no effect
 * inside a standalone `.svg` and none at all in a rasteriser. This module places
 * the glyph by its geometry instead — everything is BASELINE-RELATIVE, so the
 * caller's own baseline is the only anchor and there is nothing left to float.
 *
 * ## Where the letterforms come from
 *
 * Space Grotesk Bold, version 2.000, SIL Open Font License 1.1, as served by
 * Google Fonts:
 *
 *   https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf
 *   sha256 3e756954468ff1cb302dae0414262e72f76a67d87bef3fa1f3226cd0fb9b2d85
 *
 * The four glyphs were converted to outlines with fontTools' `SVGPathPen` under
 * the transform `(0.1, 0, 0, -0.1, 0, 0)`: 1000 font units to the em becomes 100,
 * and the y-axis flips to SVG's downward one with the baseline left at y=0.
 *
 * OUTLINES RATHER THAN A `font-family`, because the artwork is RASTERISED. An SVG
 * that says `font-family="Space Grotesk"` renders in whatever the renderer has —
 * the file this replaced asked for `Avenir Next, SF Pro Display, Arial` and got
 * one of those — and the store would then show the wordmark in the wrong
 * typeface. It also means no font file has to be committed to draw a banner;
 * bundling the typefaces for the APP is Story 21.6.
 *
 * The extracted em geometry agrees with `docs/design/cardi/`, measured rather than
 * assumed: the drawn `x` is 49.6 units tall (the `XHEIGHT` the mark uses), `d`
 * reaches 70.0 (its `BASELINE`), and `r`'s x-height shoulder lands exactly on
 * `STEM_TOP`.
 */

/**
 * `Card`, baseline-relative: 100 units to the em, y DOWN, baseline at y = 0.
 * `bounds` is the glyph's exact outline extent from the font, not a flattened
 * approximation of it, so the caller can frame the wordmark without rasterising.
 */
export const SPACE_GROTESK_BOLD_GLYPHS = {
  C: {
    advance: 64.4,
    bounds: { x0: 5, y0: -71.4, x1: 60.2, y1: 1.4 },
    path: 'M33.2 1.4Q20.2 1.4 12.6 -5.85Q5 -13.1 5 -26.6V-43.4Q5 -56.9 12.6 -64.15Q20.2 -71.4 33.2 -71.4Q46.1 -71.4 53.15 -64.35Q60.2 -57.3 60.2 -45V-44.4H47.2V-45.4Q47.2 -51.6 43.75 -55.6Q40.3 -59.6 33.2 -59.6Q26.2 -59.6 22.2 -55.3Q18.2 -51 18.2 -43.6V-26.4Q18.2 -19.1 22.2 -14.75Q26.2 -10.4 33.2 -10.4Q40.3 -10.4 43.75 -14.45Q47.2 -18.5 47.2 -24.6V-26.4H60.2V-25Q60.2 -12.7 53.15 -5.65Q46.1 1.4 33.2 1.4Z'
  },
  a: {
    advance: 57.8,
    bounds: { x0: 3.8, y0: -51, x1: 55.6, y1: 1.4 },
    path: 'M22.4 1.4Q17.1 1.4 12.9 -0.45Q8.7 -2.3 6.25 -5.85Q3.8 -9.4 3.8 -14.5Q3.8 -19.6 6.25 -23.05Q8.7 -26.5 13.05 -28.25Q17.4 -30 23 -30H36.6V-32.8Q36.6 -36.3 34.4 -38.55Q32.2 -40.8 27.4 -40.8Q22.7 -40.8 20.4 -38.65Q18.1 -36.5 17.4 -33.1L5.8 -37Q7 -40.8 9.65 -43.95Q12.3 -47.1 16.75 -49.05Q21.2 -51 27.6 -51Q37.4 -51 43.1 -46.1Q48.8 -41.2 48.8 -31.9V-13.4Q48.8 -10.4 51.6 -10.4H55.6V0H47.2Q43.5 0 41.1 -1.8Q38.7 -3.6 38.7 -6.6V-6.7H36.8Q36.4 -5.5 35 -3.55Q33.6 -1.6 30.6 -0.1Q27.6 1.4 22.4 1.4ZM24.6 -8.8Q29.9 -8.8 33.25 -11.75Q36.6 -14.7 36.6 -19.6V-20.6H23.9Q20.4 -20.6 18.4 -19.1Q16.4 -17.6 16.4 -14.9Q16.4 -12.2 18.5 -10.5Q20.6 -8.8 24.6 -8.8Z'
  },
  r: {
    advance: 39.6,
    bounds: { x0: 7, y0: -49.8, x1: 36.8, y1: 0 },
    path: 'M7 0V-49.6H19.4V-44H21.2Q22.3 -47 24.85 -48.4Q27.4 -49.8 30.8 -49.8H36.8V-38.6H30.6Q25.8 -38.6 22.7 -36.05Q19.6 -33.5 19.6 -28.2V0Z'
  },
  d: {
    advance: 63.8,
    bounds: { x0: 4.6, y0: -70, x1: 56.8, y1: 1.4 },
    path: 'M27 1.4Q21.1 1.4 15.95 -1.55Q10.8 -4.5 7.7 -10.2Q4.6 -15.9 4.6 -24V-25.6Q4.6 -33.7 7.7 -39.4Q10.8 -45.1 15.9 -48.05Q21 -51 27 -51Q31.5 -51 34.55 -49.95Q37.6 -48.9 39.5 -47.3Q41.4 -45.7 42.4 -43.9H44.2V-70H56.8V0H44.4V-6H42.6Q40.9 -3.2 37.35 -0.9Q33.8 1.4 27 1.4ZM30.8 -9.6Q36.6 -9.6 40.5 -13.35Q44.4 -17.1 44.4 -24.3V-25.3Q44.4 -32.5 40.55 -36.25Q36.7 -40 30.8 -40Q25 -40 21.1 -36.25Q17.2 -32.5 17.2 -25.3V-24.3Q17.2 -17.1 21.1 -13.35Q25 -9.6 30.8 -9.6Z'
  }
};

/**
 * The font's own kerning for the one pair in `Cardì` that carries any: GPOS asks
 * for -18/1000 em between `r` and `d`. Dropping it is what leaves a wordmark
 * looking loose in the middle, and it is 1.8 units at this scale.
 */
export const KERNING = { rd: -1.8 };

/**
 * Tracking, in em units, applied between letters. The wordmark's, not the font's.
 *
 * `-0.03em` is `display-lg`'s value — the tightest in the type scale, and the scale
 * already tightens as size grows (`headline-md` at 24px is `-0.01em`, `display-lg` at
 * 34px is `-0.03em`). The banner draws the wordmark at roughly 600px, far past either,
 * so the tightest end is the right one to take.
 *
 * ⚠️ The lockup sheets do NOT agree with each other and cannot settle this:
 * `mark_locked.py`, `grave_vs_acute.py`, `icon_decision.py` and `icon_explore.py` set
 * `-0.02em`; `brand_lockup.py` and `mark_sweep35.py` set `-0.03em`. All six set it for
 * specimens between 16 and 84px rather than for a logotype, so this follows the token
 * rather than any one sheet.
 */
export const LETTER_SPACING = -3;

/**
 * The drawn `ì`, from `mark_locked.py`: 35°, contained, round caps — "ifero's
 * choice, carried over exactly".
 *
 * `length` is `LEN_WORD`, deliberately NOT the mark's `LEN_MARK` of 52: contained
 * means the accent stays inside the letter's own 30-unit advance, which is also
 * what keeps it clear of the `d` in front of it.
 */
export const WORD_ACCENT = { length: 24, weight: 9, centreY: 10.5 };

/** `stem_single(w=12)`: one rounded bar from the x-height to the baseline. */
export const WORD_STEM_WIDTH = 12;

const radians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Position `Cardì` on a baseline, in em units.
 *
 * Everything is returned in the caller's own em space — it owns `baseline`,
 * `xHeight`, `markAdvance` and `angle`, so there is no second copy of those
 * numbers here to drift from the mark's.
 *
 * @param {{baseline: number, xHeight: number, markAdvance: number, angle: number}} em
 * @returns {{
 *   letters: {glyph: string, path: string, dx: number}[],
 *   stem: {x: number, y: number, width: number, height: number, radius: number},
 *   beam: {x: number, y: number, width: number, height: number, radius: number,
 *          pivotX: number, pivotY: number, angle: number},
 *   advance: number,
 *   ink: {x0: number, y0: number, x1: number, y1: number}
 * }} `ink` is the drawn extent, which is what to centre on. It is WIDER than
 *   `advance` on neither side here — the contained accent is the reason — but it
 *   is narrower on both, because `C` has a left side bearing and the `ì` stops
 *   short of its advance.
 */
export const layoutWordmark = ({ baseline, xHeight, markAdvance, angle }) => {
  const letters = [];
  let pen = 0;
  let previous = null;
  for (const glyph of 'Card') {
    if (previous !== null) pen += LETTER_SPACING + (KERNING[previous + glyph] ?? 0);
    letters.push({ glyph, path: SPACE_GROTESK_BOLD_GLYPHS[glyph].path, dx: pen });
    pen += SPACE_GROTESK_BOLD_GLYPHS[glyph].advance;
    previous = glyph;
  }
  const markX = pen + LETTER_SPACING;

  const centreX = markX + markAdvance / 2;
  const stem = {
    x: centreX - WORD_STEM_WIDTH / 2,
    y: baseline - xHeight,
    width: WORD_STEM_WIDTH,
    height: xHeight,
    radius: WORD_STEM_WIDTH / 2
  };
  // The accent's centre is quoted in `mark_locked.py`'s 1em box, whose baseline
  // is at 70; re-express it against whatever baseline this caller uses.
  const beamCentreY = baseline - (70 - WORD_ACCENT.centreY);
  const beam = {
    x: centreX - WORD_ACCENT.length / 2,
    y: beamCentreY - WORD_ACCENT.weight / 2,
    width: WORD_ACCENT.length,
    height: WORD_ACCENT.weight,
    radius: WORD_ACCENT.weight / 2,
    pivotX: centreX,
    pivotY: beamCentreY,
    angle
  };

  // The accent's rotated extent, closed-form — no need to flatten it to find out
  // how far the accent reaches. It is also the number that proves "contained":
  // it must stay inside the mark's own advance.
  //
  // `rx` is half the height, so the caps are true semicircles and the shape is a
  // STADIUM — the spine (shorter than `length` by one `weight`, because a cap eats
  // half of it at each end) swept by a disc of `weight / 2`. Its bounding box is
  // the rotated spine plus that radius on each axis, NOT the rotated corners of a
  // sharp rectangle, which overstates it by about 1.8 units at this angle.
  //
  // ⚠️ This deliberately differs from `beamExtent()` in `build-brand-icons.mjs`,
  // which does take the sharp-rectangle form. Both are right for their own job:
  // that one bounds the mark for CONTAINMENT inside Android's safe circle, where
  // erring outward is the safe direction, while this is the drawn extent the
  // banner CENTRES on, where erring outward pushes the wordmark off centre.
  const spine = (WORD_ACCENT.length - WORD_ACCENT.weight) / 2;
  const cap = WORD_ACCENT.weight / 2;
  const halfWidth = spine * Math.cos(radians(angle)) + cap;
  const halfHeight = spine * Math.sin(radians(angle)) + cap;

  const ink = {
    x0: Math.min(...letters.map((l) => l.dx + SPACE_GROTESK_BOLD_GLYPHS[l.glyph].bounds.x0)),
    x1: Math.max(
      ...letters.map((l) => l.dx + SPACE_GROTESK_BOLD_GLYPHS[l.glyph].bounds.x1),
      centreX + halfWidth
    ),
    y0: Math.min(
      ...letters.map((l) => baseline + SPACE_GROTESK_BOLD_GLYPHS[l.glyph].bounds.y0),
      beamCentreY - halfHeight
    ),
    y1: Math.max(
      ...letters.map((l) => baseline + SPACE_GROTESK_BOLD_GLYPHS[l.glyph].bounds.y1),
      baseline
    )
  };

  return { letters, stem, beam, advance: markX + markAdvance, ink };
};
