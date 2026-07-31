/**
 * Card-grid layout contract tests
 * Story 16.22: Fix card-grid tile overlap on narrow screens — AC2, AC4, AC5, AC6, AC10
 *
 * Pure-arithmetic contract test — no renders. Modelled on
 * targets/watch/__tests__/watch-layout-contract.test.ts.
 *
 * The invariant under test is "a tile fits its own grid cell at every viewport
 * width", NOT "a tile is 171 pt". The bug this story fixes was a frozen
 * measurement (171 pt, derived once on a 390 dp Figma frame) masquerading as an
 * invariant, so the guard has to be the relationship, swept across widths.
 */

import {
  GUTTER,
  LIST_CONTENT_PADDING,
  NUM_COLUMNS,
  SCREEN_MARGIN,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  getGridTileHeight,
  getGridTileWidth,
  getSingleTileHeight,
  getSingleTileWidth
} from './gridLayout';

/**
 * Width FlashList hands a single grid cell, transcribed independently from
 * @shopify/flash-list 2.0.2 rather than reusing the helper's own arithmetic —
 * that independence is what makes this a contract test:
 *
 *   GridLayoutManager.getWidth()  → boundedSize / maxColumns
 *   boundedSize (RecyclerView)    → measured by a full-width probe view mounted
 *                                   INSIDE the padded content container, so it
 *                                   is windowWidth − 2 × listContent padding
 *
 * `tileWrapper` then spends GUTTER / 2 on each side of that cell, leaving this
 * much room for the tile itself.
 */
const cellContentWidth = (windowWidth: number): number =>
  (windowWidth - 2 * LIST_CONTENT_PADDING) / NUM_COLUMNS - GUTTER;

/** Every width in [from, to] inclusive — the AC2 sweep, not a sample. */
const widthRange = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Non-integer dp widths. Android reports `pixels / density`, and density is a float
 * that need not divide evenly, so a fractional viewport is a real configuration —
 * not a hypothetical. Each entry is a plausible pixel/density pair plus a fine
 * fractional walk to catch the worst case rather than a lucky sample.
 */
const FRACTIONAL_WIDTHS: number[] = [
  1080 / 2.625, // 411.428… — common Android flagship
  1080 / 2.75, // 392.727…
  1440 / 3.5, // 411.428…
  1080 / 2.8, // 385.714…
  720 / 2.1, // 342.857…
  ...Array.from({ length: 400 }, (_, i) => 320 + i * 0.257)
]
  // Guard the fixture against itself: a "density" that happens to divide evenly
  // (1080 / 2.8125 is exactly 384) contributes nothing to a FRACTIONAL sweep, and
  // silently dropping it would leave the list looking broader than it is.
  .filter((w) => !Number.isInteger(w));

describe('card-grid layout contract (Story 16.22)', () => {
  describe('grid geometry constants — AC3, AC9', () => {
    it('keeps the 2-column / 16 pt / 16 pt design rhythm', () => {
      expect(NUM_COLUMNS).toBe(2);
      expect(SCREEN_MARGIN).toBe(16);
      expect(GUTTER).toBe(16);
    });

    it('splits the outer margin so listContent + tileWrapper sum to SCREEN_MARGIN', () => {
      // The whole point of deriving this rather than hardcoding 8: the style and
      // the maths cannot drift apart.
      expect(LIST_CONTENT_PADDING).toBe(8);
      expect(LIST_CONTENT_PADDING + GUTTER / 2).toBe(SCREEN_MARGIN);
    });

    it('keeps the design reference dimensions at their 390 dp values', () => {
      expect(TILE_WIDTH).toBe(171);
      expect(TILE_HEIGHT).toBe(140);
      expect(SINGLE_TILE_WIDTH).toBe(220);
      expect(SINGLE_TILE_HEIGHT).toBe(180);
    });
  });

  describe('device width table — AC1, AC5', () => {
    // Representative widths required by AC6. Rows below 374 dp are the bug.
    const cases: { width: number; tileWidth: number; tileHeight: number; note: string }[] = [
      { width: 320, tileWidth: 136, tileHeight: 111, note: 'small/older Android' },
      { width: 340, tileWidth: 146, tileHeight: 120, note: '360 dp at raised Display size' },
      { width: 360, tileWidth: 156, tileHeight: 128, note: 'most common Android portrait' },
      { width: 375, tileWidth: 163, tileHeight: 133, note: 'iPhone SE 2/3, 8, 12/13 mini' },
      { width: 384, tileWidth: 168, tileHeight: 138, note: 'narrow Android flagship' },
      { width: 390, tileWidth: 171, tileHeight: 140, note: 'design reference — iPhone 12–16' },
      { width: 393, tileWidth: 172, tileHeight: 141, note: 'Pixel 6–9' },
      { width: 402, tileWidth: 177, tileHeight: 145, note: 'iPhone 16 Pro' },
      { width: 412, tileWidth: 182, tileHeight: 149, note: 'larger Android flagships' },
      { width: 430, tileWidth: 191, tileHeight: 156, note: 'iPhone Pro Max' }
    ];

    it.each(cases)(
      '$width dp → $tileWidth × $tileHeight ($note)',
      ({ width, tileWidth, tileHeight }) => {
        expect(getGridTileWidth(width)).toBe(tileWidth);
        expect(getGridTileHeight(getGridTileWidth(width))).toBe(tileHeight);
      }
    );
  });

  describe('zero visual change at the design reference width — AC4', () => {
    it('reproduces exactly 171 × 140 at 390 dp', () => {
      const width = getGridTileWidth(390);
      expect(width).toBe(TILE_WIDTH);
      expect(getGridTileHeight(width)).toBe(TILE_HEIGHT);
    });
  });

  describe('overlap is arithmetically impossible — AC2', () => {
    const sweep = widthRange(280, 1024);

    it('fits two tiles plus 16 pt margins and a 16 pt gutter at every width 280–1024 dp', () => {
      const violations = sweep.filter(
        (w) => 2 * getGridTileWidth(w) + 2 * SCREEN_MARGIN + GUTTER > w
      );
      expect(violations).toEqual([]);
    });

    it('never exceeds the width FlashList gives the cell, at any width 280–1024 dp', () => {
      const violations = sweep.filter((w) => getGridTileWidth(w) > cellContentWidth(w));
      expect(violations).toEqual([]);
    });

    /**
     * What the user actually sees, given the tile is centre-aligned in a content box
     * that `Math.floor` may have left slightly wider than the tile. The leftover
     * splits evenly on both sides, so it pads the outer margin by one share and the
     * gutter — which is two adjacent shares — by two.
     */
    const rendered = (windowWidth: number) => {
      const slackPerSide = (cellContentWidth(windowWidth) - getGridTileWidth(windowWidth)) / 2;
      return { outerMargin: SCREEN_MARGIN + slackPerSide, gutter: GUTTER + 2 * slackPerSide };
    };

    it('never lets the centering slack eat into the 16 pt margin or gutter — AC3', () => {
      // The direction is the safety property: slack can only ever ADD clearance, never
      // remove it, so AC2 holds regardless of how the viewport is reported. Flooring is
      // required by Open Decision 5, and asymmetric per-column padding — the only way to
      // land exact integers — is rejected by Open Decision 3, so some slack is inherent.
      const violations = [...sweep, ...FRACTIONAL_WIDTHS]
        .map((w) => ({ w, ...rendered(w) }))
        .filter((m) => m.outerMargin < SCREEN_MARGIN || m.gutter < GUTTER);
      expect(violations).toEqual([]);
    });

    it('holds 16 pt exactly at even widths and exactly 16.25/16.5 at odd ones — AC3', () => {
      // At INTEGER widths the slack is not merely bounded, it is DETERMINED: `W − 48`
      // is even at even widths so `floor` sheds nothing, and odd at odd widths so it
      // sheds exactly 0.5 pt. Asserting equality rather than `≤` means a regression
      // that moved odd-width slack anywhere inside the old bound still fails. Both
      // values are exact in binary floating point (0.25 and 0.5 are powers of two).
      const measured = sweep.map((w) => ({ w, ...rendered(w) }));

      const evenWidths = measured.filter((m) => m.w % 2 === 0);
      expect(evenWidths.filter((m) => m.outerMargin !== SCREEN_MARGIN)).toEqual([]);
      expect(evenWidths.filter((m) => m.gutter !== GUTTER)).toEqual([]);

      const oddWidths = measured.filter((m) => m.w % 2 !== 0);
      expect(oddWidths.filter((m) => m.outerMargin !== SCREEN_MARGIN + 0.25)).toEqual([]);
      expect(oddWidths.filter((m) => m.gutter !== GUTTER + 0.5)).toEqual([]);

      // Both partitions are non-empty, so neither block above can pass vacuously.
      expect(evenWidths.length).toBeGreaterThan(0);
      expect(oddWidths.length).toBeGreaterThan(0);
    });

    it('stays under 0.5/1.0 pt of slack even at fractional widths — AC3', () => {
      // Integer widths are NOT the only case: Android dp width is pixels / density, and
      // density is a float that need not divide evenly — 1080 / 2.625 = 411.428…dp is a
      // real configuration, and that is the very Display-size mechanism this story is
      // about. There, `floor` can shed almost a full point rather than exactly 0.5, so
      // the bound is twice the integer-width one. Still sub-point, still one-directional.
      const measured = FRACTIONAL_WIDTHS.map((w) => ({ w, ...rendered(w) }));

      expect(measured.filter((m) => m.outerMargin >= SCREEN_MARGIN + 0.5)).toEqual([]);
      expect(measured.filter((m) => m.gutter >= GUTTER + 1)).toEqual([]);

      // Sanity-check the sweep is actually exercising the wider bound, so this test
      // cannot pass by accident on a list of near-integers.
      expect(measured.some((m) => m.outerMargin > SCREEN_MARGIN + 0.25)).toBe(true);
    });

    it('reproduces the 374 dp overlap cliff of the shipped fixed-width tile', () => {
      // Guards the guard. Pre-fix geometry: listContent.paddingHorizontal was the
      // full SCREEN_MARGIN, so a row had W − 32 to hold two hardcoded 171 pt tiles
      // and they collided below 374 dp. Proves the invariant above would have
      // caught the shipped bug instead of passing vacuously.
      const overlapping = sweep.filter((w) => 2 * TILE_WIDTH > w - 2 * SCREEN_MARGIN);
      expect(overlapping[overlapping.length - 1]).toBe(373);
      expect(overlapping).toContain(360);
      expect(overlapping).not.toContain(375);
    });

    it('grows monotonically with the viewport', () => {
      const nonMonotonic = sweep
        .slice(1)
        .filter((w) => getGridTileWidth(w) < getGridTileWidth(w - 1));
      expect(nonMonotonic).toEqual([]);
    });
  });

  describe('degenerate inputs', () => {
    it.each([0, 1, 48, -100])('never returns a width below 1 for %p', (input) => {
      expect(getGridTileWidth(input)).toBeGreaterThanOrEqual(1);
    });

    it('keeps the derived height positive for a degenerate width', () => {
      expect(getGridTileHeight(getGridTileWidth(0))).toBeGreaterThanOrEqual(1);
    });

    // `Math.max(1, NaN)` is NaN, so the clamp alone would let a non-finite input
    // reach a style value as a silent NaN width. Every entry point must clamp.
    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
      'clamps a non-finite input to a finite dimension for %p',
      (input) => {
        for (const value of [
          getGridTileWidth(input),
          getGridTileHeight(input),
          getSingleTileWidth(input),
          getSingleTileHeight(input)
        ]) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(1);
        }
      }
    );

    it('returns whole-pixel widths for a fractional viewport', () => {
      // Some devices report non-integer logical widths; a fractional tile width
      // would reintroduce sub-pixel overflow.
      expect(Number.isInteger(getGridTileWidth(360.5))).toBe(true);
      expect(Number.isInteger(getSingleTileWidth(240.5))).toBe(true);
    });
  });

  describe('single-card enlarged tile — AC10', () => {
    it.each([320, 360, 375, 390, 412, 430])('stays 220 × 180 at %i dp (clamp dormant)', (width) => {
      expect(getSingleTileWidth(width)).toBe(SINGLE_TILE_WIDTH);
      expect(getSingleTileHeight(getSingleTileWidth(width))).toBe(SINGLE_TILE_HEIGHT);
    });

    it('clamps to the available width below the 252 dp threshold', () => {
      // No shipped phone is this narrow — this exists so the same class of bug
      // cannot reappear through the second code path.
      expect(getSingleTileWidth(240)).toBe(240 - 2 * SCREEN_MARGIN);
      expect(getSingleTileHeight(getSingleTileWidth(240))).toBe(
        Math.round((240 - 2 * SCREEN_MARGIN) * (SINGLE_TILE_HEIGHT / SINGLE_TILE_WIDTH))
      );
    });

    it('never overflows the screen margins at any width 280–1024 dp', () => {
      const violations = widthRange(280, 1024).filter(
        (w) => getSingleTileWidth(w) + 2 * SCREEN_MARGIN > w
      );
      expect(violations).toEqual([]);
    });

    it.each([0, -100])('never returns a width below 1 for %p', (input) => {
      expect(getSingleTileWidth(input)).toBeGreaterThanOrEqual(1);
    });
  });
});
