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
  AVATAR_SIZE,
  BADGE_CLEARANCE,
  BADGE_INSET,
  BADGE_KEEP_OUT,
  BADGE_SIZE,
  FALLBACK_TEXT_SIZE,
  GUTTER,
  LIST_CONTENT_PADDING,
  LOGO_SLOT_SIZE,
  MIN_COMFORTABLE_TILE_WIDTH,
  NUM_COLUMNS,
  SCREEN_MARGIN,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
  getFallbackChildMetrics,
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

/**
 * Intra-tile geometry contract — follow-up to Story 16.22's QA finding 3.
 *
 * Story 16.22 made the tile track the viewport, which turned `CardTile`'s two FIXED
 * centred children (`logoSlot` 64 pt, `avatarCircle` 48 pt) into the same species of
 * frozen measurement the tile itself had been. A 3-column grid — 16.22's own flagged
 * follow-up, already implemented in `CatalogueGrid.tsx` — reaches the collision at
 * ≈116 pt on a 412 dp phone.
 *
 * As above, the invariant under test is the RELATIONSHIP ("a centred child clears the
 * right-pinned badge"), swept across every tile a 2- OR 3-column grid can produce,
 * rather than a spot check at whatever width happens to ship today.
 */
describe('intra-tile fallback geometry vs the favourite badge', () => {
  /** Left edge (pt) of the right-pinned badge on a tile of the given width. */
  const badgeLeftEdge = (tileWidth: number): number => tileWidth - BADGE_INSET - BADGE_SIZE;

  /** Right edge (pt) of a centre-aligned child — it grows from the tile's middle. */
  const centredRightEdge = (tileWidth: number, size: number): number => tileWidth / 2 + size / 2;

  /** Gap (pt) between the two. Negative means they overlap. */
  const gap = (tileWidth: number, size: number): number =>
    badgeLeftEdge(tileWidth) - centredRightEdge(tileWidth, size);

  /**
   * Tile width a grid of `columns` columns yields at a viewport.
   *
   * Delegates to the production helper rather than transcribing it, deliberately unlike
   * `cellContentWidth` above: that one models a *third party* (FlashList), where an
   * independent copy is the point, while this is the very function under test. Reusing
   * it means these sweeps automatically follow any change to the tile arithmetic instead
   * of silently testing a stale copy of it.
   */
  const tileWidthFor = (windowWidth: number, columns: number): number =>
    getGridTileWidth(windowWidth, columns);

  /** The proportional size before any capping — the ideal the cap trims. */
  const proportional = (tileWidth: number, referenceSize: number): number =>
    Math.round((tileWidth * referenceSize) / TILE_WIDTH);

  const REFERENCES = [
    { name: 'logoSlot', referenceSize: LOGO_SLOT_SIZE },
    { name: 'avatarCircle', referenceSize: AVATAR_SIZE }
  ];

  /** Worst gap across both children at a given tile width. */
  const worstGap = (tileWidth: number): number =>
    Math.min(
      ...REFERENCES.map(({ referenceSize }) =>
        gap(tileWidth, getFallbackChildMetrics(tileWidth, referenceSize).size)
      )
    );

  describe('the keep-out constant', () => {
    it('is derived from the badge geometry, doubled because the child is centred', () => {
      expect(BADGE_SIZE).toBe(24);
      expect(BADGE_INSET).toBe(6);
      expect(BADGE_CLEARANCE).toBe(4);
      // Derived, not 68 written down — the badge style and this arithmetic must not
      // be able to drift apart, exactly as with LIST_CONTENT_PADDING above.
      expect(BADGE_KEEP_OUT).toBe(2 * (BADGE_INSET + BADGE_SIZE + BADGE_CLEARANCE));
      expect(BADGE_KEEP_OUT).toBe(68);
    });

    it('keeps the fallback design references at their 390 dp values', () => {
      expect(LOGO_SLOT_SIZE).toBe(64);
      expect(AVATAR_SIZE).toBe(48);
      expect(FALLBACK_TEXT_SIZE).toBe(18);
    });

    it("cannot be satisfied by the tile's own 0.85 logo factor at any real width", () => {
      // Guards the REASONING, not just the result. The obvious move is to copy
      // `logoWidth = round(tileWidth * 0.85)` from the SVG branch. For a CENTRED
      // child that needs 0.85·T ≤ T − 68, i.e. a tile wider than 450 pt — no phone is
      // close. The SVG logo overlaps the badge today for exactly this reason, which
      // is accepted there (opaque plate over a transparent logo) but would not be for
      // two translucent plates.
      const satisfied = widthRange(1, 450).filter(
        (t) => Math.round(t * 0.85) <= t - BADGE_KEEP_OUT
      );
      expect(satisfied).toEqual([]);
      expect(gap(TILE_WIDTH, Math.round(TILE_WIDTH * 0.85))).toBeLessThan(0);
    });
  });

  describe('zero visual change at the design reference width', () => {
    it.each(REFERENCES)('reproduces $name exactly at the 390 dp tile', ({ referenceSize }) => {
      expect(getGridTileWidth(390)).toBe(TILE_WIDTH);
      const metrics = getFallbackChildMetrics(TILE_WIDTH, referenceSize);
      expect(metrics.size).toBe(referenceSize);
      expect(metrics.fontSize).toBe(FALLBACK_TEXT_SIZE);
    });
  });

  describe('applied sizes by device and column count', () => {
    // Documents the visual change this makes, so a "my avatars look smaller" report
    // from a 320 dp phone — or a larger one from a Pro Max — is recognisable as
    // intended rather than mistaken for a regression.
    const cases: {
      width: number;
      columns: number;
      tileWidth: number;
      slot: number;
      avatar: number;
      note: string;
    }[] = [
      { width: 320, columns: 2, tileWidth: 136, slot: 51, avatar: 38, note: 'small Android' },
      { width: 360, columns: 2, tileWidth: 156, slot: 58, avatar: 44, note: 'common Android' },
      {
        width: 390,
        columns: 2,
        tileWidth: 171,
        slot: 64,
        avatar: 48,
        note: 'reference — no change'
      },
      { width: 430, columns: 2, tileWidth: 191, slot: 71, avatar: 54, note: 'iPhone Pro Max' },
      {
        width: 412,
        columns: 3,
        tileWidth: 116,
        slot: 43,
        avatar: 33,
        note: '3-col — was overlapping'
      },
      { width: 360, columns: 3, tileWidth: 98, slot: 30, avatar: 28, note: '3-col, cap binding' }
    ];

    it.each(cases)(
      '$width dp x$columns → tile $tileWidth, slot $slot, avatar $avatar ($note)',
      ({ width, columns, tileWidth, slot, avatar }) => {
        expect(tileWidthFor(width, columns)).toBe(tileWidth);
        expect(getFallbackChildMetrics(tileWidth, LOGO_SLOT_SIZE).size).toBe(slot);
        expect(getFallbackChildMetrics(tileWidth, AVATAR_SIZE).size).toBe(avatar);
      }
    );
  });

  describe('clearance is arithmetically impossible to lose', () => {
    it.each(REFERENCES)(
      'keeps $name clear of the badge at every 2- and 3-column tile from 280–1024 dp',
      ({ referenceSize }) => {
        const violations: { columns: number; windowWidth: number; tile: number; gap: number }[] =
          [];
        for (const columns of [2, 3]) {
          for (const windowWidth of widthRange(280, 1024)) {
            const tile = tileWidthFor(windowWidth, columns);
            const { size } = getFallbackChildMetrics(tile, referenceSize);
            const measured = gap(tile, size);
            if (measured < BADGE_CLEARANCE) {
              violations.push({ columns, windowWidth, tile, gap: measured });
            }
          }
        }
        expect(violations).toEqual([]);
      }
    );

    it('would have caught the shipped fixed sizes on a 3-column tile', () => {
      // Guards the guard, as the 374 dp cliff test does above. Without this, the
      // sweep could pass vacuously against sizes that were never at risk.
      const tile = tileWidthFor(412, 3);
      expect(tile).toBe(116);

      // The defect: a fixed 64 pt slot overlaps the badge by 4 pt here.
      expect(gap(tile, LOGO_SLOT_SIZE)).toBeLessThan(0);
      // ...while a fixed 48 pt avatar still cleared, which is precisely why a single
      // assertion at 116 pt was not enough — only the slot's was falsifiable.
      expect(gap(tile, AVATAR_SIZE)).toBeGreaterThan(0);

      // Both now clear by at least the nominal gap.
      for (const { referenceSize } of REFERENCES) {
        expect(gap(tile, getFallbackChildMetrics(tile, referenceSize).size)).toBeGreaterThanOrEqual(
          BADGE_CLEARANCE
        );
      }
    });

    it('states all three clearance thresholds exactly', () => {
      // ≥ BADGE_CLEARANCE wherever the cap is satisfiable — a 1 pt plate needs T ≥ 69.
      expect(widthRange(69, 1024).filter((t) => worstGap(t) < BADGE_CLEARANCE)).toEqual([]);
      // 61–68: the cap asks for a sub-1 pt plate, so toTileDimension's 1 pt floor
      // takes over. Still no overlap, just less than the nominal gap.
      expect(widthRange(61, 68).filter((t) => worstGap(t) < 0)).toEqual([]);
      // 60 and below: the badge's own 30 pt footprint has crossed the tile's centre
      // line, so NO centred child can clear it — the badge would have to change.
      expect(worstGap(60)).toBeLessThan(0);
      expect(worstGap(61)).toBe(0);
    });
  });

  describe('how the cap and the proportion divide the range', () => {
    it('is pure proportionality on every 2-column tile that ships today', () => {
      // The cap is a guard for a grid nobody has built yet, not a change to the
      // current one: at 320 dp (the narrowest width AC7 exercises) it is slack.
      const narrowest = tileWidthFor(320, 2);
      expect(narrowest).toBe(136);
      for (const { referenceSize } of REFERENCES) {
        expect(getFallbackChildMetrics(narrowest, referenceSize).size).toBe(
          proportional(narrowest, referenceSize)
        );
      }
    });

    it('only overrides the proportion on tiles narrower than any 2-column phone', () => {
      const capped = widthRange(1, 400).filter(
        (t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).size !== proportional(t, LOGO_SLOT_SIZE)
      );
      // Non-empty, so the cap is not vacuous...
      expect(capped.length).toBeGreaterThan(0);
      // ...but never reached by a 2-column layout on a real phone.
      expect(Math.max(...capped)).toBeLessThan(tileWidthFor(320, 2));
    });

    it.each(REFERENCES)('never shrinks $name as the tile grows', ({ referenceSize }) => {
      const sizes = widthRange(1, 1024).map((t) => getFallbackChildMetrics(t, referenceSize).size);
      expect(sizes.filter((size, i) => i > 0 && size < sizes[i - 1]!)).toEqual([]);
    });
  });

  describe('the glyph inside the plate', () => {
    const tilesFor = (columns: number, from: number, to: number): number[] =>
      widthRange(from, to).map((windowWidth) => tileWidthFor(windowWidth, columns));

    const shrunkAmong = (tiles: number[]): number[] =>
      tiles.filter((tile) =>
        REFERENCES.some(
          ({ referenceSize }) =>
            getFallbackChildMetrics(tile, referenceSize).fontSize !== FALLBACK_TEXT_SIZE
        )
      );

    it('holds the design size on every 2-column tile from 280–1024 dp', () => {
      // The plate scales; the type does NOT follow it down while the plate can still
      // hold it. So on real hardware the abbreviation and the avatar letter stay at
      // 18 pt and consistent with the rest of the app, even where the plate has shrunk
      // by 20 % at 320 dp.
      const tiles = tilesFor(2, 280, 1024);
      expect(shrunkAmong(tiles)).toEqual([]);

      // Non-vacuous: those same tiles carry a wide range of plate sizes, so the
      // assertion above reads "type held while plates moved", not "nothing moved".
      const plates = new Set(tiles.map((t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).size));
      expect(plates.size).toBeGreaterThan(10);
    });

    it('holds it for 3 columns too, down to a 349 dp viewport', () => {
      // 3 columns needs a 95 pt tile for the plate to still hold 18 pt, which is a
      // 349 dp viewport. Above that, type is untouched...
      expect(shrunkAmong(tilesFor(3, 349, 1024))).toEqual([]);
      expect(tileWidthFor(349, 3)).toBe(95);

      // ...and below it every width shrinks, so the boundary is exact rather than
      // approximate. A 3-column grid on a sub-349 dp phone is a layout the column-count
      // story should decline to produce (a minimum tile width); this records what the
      // type would do if it did.
      expect(shrunkAmong(tilesFor(3, 280, 348))).toEqual(tilesFor(3, 280, 348));
    });

    it('shrinks only once the plate can no longer hold 18 pt', () => {
      // The fit rule engages at a 26 pt plate and below, which the badge cap only
      // produces on a tile of ~94 pt — narrower than any 2- or 3-column grid above.
      // 340 dp across 3 columns (a 92 pt tile) is the kind of layout that gets there.
      const tile = tileWidthFor(340, 3);
      expect(tile).toBe(92);
      const { size, fontSize } = getFallbackChildMetrics(tile, LOGO_SLOT_SIZE);
      expect(size).toBe(24);
      expect(fontSize).toBe(16);
      expect(fontSize).toBeLessThan(FALLBACK_TEXT_SIZE);
    });

    it('never scales the glyph above its design size', () => {
      // The plate grows on a Pro Max; the type deliberately does not follow it up.
      const oversized = widthRange(1, 1024).filter((t) =>
        REFERENCES.some(
          ({ referenceSize }) =>
            getFallbackChildMetrics(t, referenceSize).fontSize > FALLBACK_TEXT_SIZE
        )
      );
      expect(oversized).toEqual([]);
      expect(getFallbackChildMetrics(tileWidthFor(430, 2), LOGO_SLOT_SIZE).size).toBe(71);
      expect(getFallbackChildMetrics(tileWidthFor(430, 2), LOGO_SLOT_SIZE).fontSize).toBe(
        FALLBACK_TEXT_SIZE
      );
    });

    it('floors at the smallest size the type scale ships (TYPOGRAPHY.caption2)', () => {
      // Reachable, unlike a plate floor: a 15 pt plate would want 10 pt type, and the
      // floor outranks the fit ratio so it gets 11 pt and is allowed to overhang. Only
      // degenerate tiles get here, but it keeps type from scaling to nothing.
      const sizes = widthRange(1, 1024).map(
        (t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).fontSize
      );
      expect(Math.min(...sizes)).toBe(11);
      expect(getFallbackChildMetrics(83, LOGO_SLOT_SIZE).size).toBe(15);
      expect(getFallbackChildMetrics(83, LOGO_SLOT_SIZE).fontSize).toBe(11);
    });
  });

  describe('degenerate inputs', () => {
    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0, -100])(
      'clamps to a finite, positive plate and glyph for %p',
      (input) => {
        for (const { referenceSize } of REFERENCES) {
          const { size, fontSize } = getFallbackChildMetrics(input, referenceSize);
          expect(Number.isFinite(size)).toBe(true);
          expect(size).toBeGreaterThanOrEqual(1);
          expect(Number.isFinite(fontSize)).toBe(true);
          expect(fontSize).toBeGreaterThanOrEqual(1);
        }
      }
    );

    it('returns whole-pixel sizes for a fractional tile width', () => {
      const { size, fontSize } = getFallbackChildMetrics(136.4, LOGO_SLOT_SIZE);
      expect(Number.isInteger(size)).toBe(true);
      expect(Number.isInteger(fontSize)).toBe(true);
    });
  });
});

/**
 * The floor a responsive column count must respect.
 *
 * Overlap is already impossible at every width — the sweeps above prove that — so this
 * is not a correctness guard. It exists because "cannot overlap" and "still looks like
 * the design" are different bars, and the gap between them is where a 2 → 3 column
 * story would land if nobody wrote the number down. `MIN_COMFORTABLE_TILE_WIDTH` is that
 * number; these tests pin the degradation stages behind it and the viewport each column
 * count needs to clear it, so a breakpoint can be chosen from measurements rather than
 * from taste.
 *
 * Deliberately NOT enforced by a runtime guard: the column count is still a constant, so
 * there is nothing to guard yet. When it becomes responsive, the story should assert its
 * chosen breakpoint against `MIN_COMFORTABLE_TILE_WIDTH` here.
 */
describe('minimum tile width for a responsive column count', () => {
  /** The proportional plate size before the badge keep-out cap trims it. */
  const proportional = (tileWidth: number, referenceSize: number): number =>
    Math.round((tileWidth * referenceSize) / TILE_WIDTH);

  /** True when the badge keep-out cap leaves the proportional size untouched. */
  const capIsSlack = (tileWidth: number): boolean =>
    [LOGO_SLOT_SIZE, AVATAR_SIZE].every(
      (ref) => getFallbackChildMetrics(tileWidth, ref).size === proportional(tileWidth, ref)
    );

  /** Smallest viewport at which `columns` columns reach the comfortable floor. */
  const smallestComfortableViewport = (columns: number): number =>
    widthRange(100, 1400).find((w) => getGridTileWidth(w, columns) >= MIN_COMFORTABLE_TILE_WIDTH)!;

  it('is derived from the badge keep-out, not written down', () => {
    // Solving T·(LOGO_SLOT_SIZE / TILE_WIDTH) ≤ T − BADGE_KEEP_OUT for T. Deriving it
    // means changing the badge or the plate ratio moves this floor automatically.
    expect(MIN_COMFORTABLE_TILE_WIDTH).toBe(
      Math.ceil((BADGE_KEEP_OUT * TILE_WIDTH) / (TILE_WIDTH - LOGO_SLOT_SIZE))
    );
    expect(MIN_COMFORTABLE_TILE_WIDTH).toBe(109);
  });

  it('carries exactly one point of headroom over the real cap boundary', () => {
    // Math.round in getFallbackChildMetrics buys a point over the continuous solution
    // (108.67…), so the cap is already slack at 108. Asserting the headroom rather than
    // just the floor means it cannot silently vanish under a future rounding change.
    const capBinds = widthRange(1, 400).filter((t) => !capIsSlack(t));
    expect(Math.max(...capBinds)).toBe(107);
    expect(capIsSlack(MIN_COMFORTABLE_TILE_WIDTH - 1)).toBe(true);
    expect(capIsSlack(MIN_COMFORTABLE_TILE_WIDTH)).toBe(true);
  });

  it('is the width at and above which the plates are purely proportional', () => {
    const capped = widthRange(MIN_COMFORTABLE_TILE_WIDTH, 1024).filter((t) => !capIsSlack(t));
    expect(capped).toEqual([]);
  });

  describe('the degradation stages below it', () => {
    // The table in MIN_COMFORTABLE_TILE_WIDTH's docs, made executable. Each stage is
    // still correct — no overlap anywhere — but progressively further from the design.
    it('95–108 pt: 18 pt type still fits everywhere in the band', () => {
      const stage = widthRange(95, MIN_COMFORTABLE_TILE_WIDTH - 1);
      expect(
        stage.filter(
          (t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).fontSize !== FALLBACK_TEXT_SIZE
        )
      ).toEqual([]);
    });

    it('95–107 pt: the cap trims the slot — and ONLY the slot', () => {
      // The asymmetry is worth pinning: `avatarCircle`'s 48/171 share stays under the
      // keep-out through this whole band, so the abbreviation slot is the only child the
      // cap ever touches here. Any reasoning about "the plates" at these widths is really
      // reasoning about the slot. (108 is excluded because it is the headroom point,
      // where rounding leaves even the slot untrimmed — see the headroom test above.)
      const band = widthRange(95, 107);
      expect(
        band.filter(
          (t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).size === proportional(t, LOGO_SLOT_SIZE)
        )
      ).toEqual([]);
      expect(
        band.filter(
          (t) => getFallbackChildMetrics(t, AVATAR_SIZE).size !== proportional(t, AVATAR_SIZE)
        )
      ).toEqual([]);
    });

    it('94 pt and below: the plate is too small for 18 pt, so the glyph shrinks too', () => {
      const stage = widthRange(61, 94);
      expect(
        stage.filter(
          (t) => getFallbackChildMetrics(t, LOGO_SLOT_SIZE).fontSize >= FALLBACK_TEXT_SIZE
        )
      ).toEqual([]);
    });

    it('85 pt: the plate collapses to 17 pt — correct, but visually poor', () => {
      expect(getFallbackChildMetrics(85, LOGO_SLOT_SIZE).size).toBe(17);
    });
  });

  describe('what each column count needs from the viewport', () => {
    it.each([
      { columns: 2, viewport: 266 },
      { columns: 3, viewport: 391 },
      { columns: 4, viewport: 516 }
    ])('$columns columns are comfortable from $viewport dp', ({ columns, viewport }) => {
      expect(smallestComfortableViewport(columns)).toBe(viewport);
      expect(getGridTileWidth(viewport, columns)).toBeGreaterThanOrEqual(
        MIN_COMFORTABLE_TILE_WIDTH
      );
      expect(getGridTileWidth(viewport - 1, columns)).toBeLessThan(MIN_COMFORTABLE_TILE_WIDTH);
    });

    it('leaves the shipped 2-column grid comfortable on every phone', () => {
      // 266 dp is far below the narrowest width AC7 exercises, so this change asks
      // nothing of the current layout — the floor only constrains a FUTURE column count.
      const uncomfortable = widthRange(280, 1024).filter(
        (w) => getGridTileWidth(w, 2) < MIN_COMFORTABLE_TILE_WIDTH
      );
      expect(uncomfortable).toEqual([]);
    });

    it('rules out 3 columns on the phones a naive breakpoint would catch', () => {
      // The trap this test exists to close. Each is a plausible "large phone" breakpoint
      // that still produces a sub-floor tile.
      for (const viewport of [320, 360, 375, 384, 390]) {
        expect(getGridTileWidth(viewport, 3)).toBeLessThan(MIN_COMFORTABLE_TILE_WIDTH);
      }
    });

    it('splits the modern phone range one dp above the design reference', () => {
      // The sharpest fact for a breakpoint decision, and not one anybody would guess:
      // a 390 dp iPhone misses the floor by exactly ONE point, while a 393 dp Pixel
      // clears it. So "3 columns on large phones" is decidable, but only just — which is
      // the whole argument for stating the floor as a number instead of eyeballing it.
      expect(getGridTileWidth(390, 3)).toBe(MIN_COMFORTABLE_TILE_WIDTH - 1);
      expect(getGridTileWidth(391, 3)).toBe(MIN_COMFORTABLE_TILE_WIDTH);

      // Everything from the Pixel up is comfortable, so a 3-column grid is genuinely
      // available to most current hardware — it is the narrow tail that must stay at 2.
      for (const viewport of [393, 402, 412, 430]) {
        expect(getGridTileWidth(viewport, 3)).toBeGreaterThanOrEqual(MIN_COMFORTABLE_TILE_WIDTH);
      }
    });

    it("clears 3 columns at CatalogueGrid's existing 600 dp breakpoint", () => {
      // features/cards/components/CatalogueGrid.tsx:27 — the in-folder precedent a
      // future story is most likely to copy. Confirmed safe, with room to spare.
      const CATALOGUE_COLUMN_BREAKPOINT = 600;
      expect(getGridTileWidth(CATALOGUE_COLUMN_BREAKPOINT, 3)).toBeGreaterThanOrEqual(
        MIN_COMFORTABLE_TILE_WIDTH
      );
      expect(CATALOGUE_COLUMN_BREAKPOINT).toBeGreaterThanOrEqual(smallestComfortableViewport(3));
    });

    it('needs a wider viewport for every column it adds', () => {
      const needed = [2, 3, 4, 5].map(smallestComfortableViewport);
      expect(needed).toEqual([...needed].sort((a, b) => a - b));
      expect(new Set(needed).size).toBe(needed.length);
    });
  });
});
