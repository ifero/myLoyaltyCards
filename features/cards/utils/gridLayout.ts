/**
 * Card-grid layout geometry
 * Story 16.22: Fix card-grid tile overlap on narrow screens
 *
 * Pure arithmetic — no React, no react-native imports. The home-screen card grid
 * derives its tile size from the viewport here so that the tile can never be
 * wider than the cell FlashList assigns it.
 *
 * ## Why this module exists
 *
 * `TILE_WIDTH = 171` was never an arbitrary design value: it is
 * `(390 − 2 × 16 screen margin − 16 gutter) / 2 columns`, measured once on
 * Figma's default 390 dp iPhone frame (Story 13.2) and then frozen as a
 * constant, at which point it stopped being a function of the viewport.
 *
 * FlashList v2 hands each grid cell an exact width and does not negotiate with
 * the child (`GridLayoutManager.getWidth() = boundedSize / maxColumns`), so an
 * oversized tile paints *outside* its cell instead of reflowing. Below 374 dp
 * the two tiles in a row therefore overlapped — 14 dp at 360 dp, the most common
 * Android portrait width. iOS never showed it because the narrowest shipped
 * iPhone is 375 dp, one dp above the cliff.
 *
 * The invariant is "the tile fits its cell", not "the tile is 171 pt". It is
 * enforced by `gridLayout.test.ts`, swept across 280–1024 dp.
 *
 * ## The margin split
 *
 * `CardList` spends the 16 pt screen margin in two places: `LIST_CONTENT_PADDING`
 * (8) on the list's content container and `GUTTER / 2` (8) on each tile wrapper.
 * Two adjacent wrappers therefore contribute a 16 pt gutter and the outer edges
 * 8 + 8 = 16 pt of margin — at every width, with no column index needed.
 *
 * That 16/16 is exact only when `Math.floor` sheds nothing — i.e. at even integer
 * widths, including the 390 dp design reference. Otherwise the tile ends up
 * narrower than its content box and, being centre-aligned, the leftover splits
 * evenly on both sides:
 *
 * - odd integer widths → floor sheds exactly 0.5 pt → margin is exactly 16.25 and
 *   gutter exactly 16.5 (determined, not merely bounded)
 * - fractional widths → floor can shed nearly a full point → margin < 16.5,
 *   gutter < 17. Not hypothetical: Android reports `pixels / density` and density
 *   is a float that need not divide evenly (1080 / 2.625 = 411.428…dp), which is
 *   the very Display-size mechanism this module exists for.
 *
 * The slack can only ever ADD clearance, never remove it, so the no-overlap
 * invariant holds for any real viewport. Both bounds are asserted in
 * `gridLayout.test.ts` so neither can silently grow.
 */

/** Fixed column count. Deliberately not responsive — see the story's Out of scope. */
export const NUM_COLUMNS = 2;

/** Horizontal screen margin (pt) either side of the grid. */
export const SCREEN_MARGIN = 16;

/** Horizontal gap (pt) between the two columns. */
export const GUTTER = 16;

/**
 * `paddingHorizontal` for the FlashList content container (pt).
 *
 * Derived, not hardcoded: the remainder of `SCREEN_MARGIN` after each tile
 * wrapper's own `GUTTER / 2`. Keeping it derived means the stylesheet and this
 * arithmetic cannot drift apart.
 */
export const LIST_CONTENT_PADDING = SCREEN_MARGIN - GUTTER / 2;

/**
 * Design reference tile dimensions (pt) at the 390 dp reference viewport, and the
 * source of the grid tile's aspect ratio.
 *
 * These are **not** applied layout widths — `getGridTileWidth()` is. They are
 * re-exported by `CardTile` so the component's public surface is unchanged.
 */
export const TILE_WIDTH = 171;
export const TILE_HEIGHT = 140;

/** Grid tile corner radius (pt). Fixed — it does not scale with the tile. */
export const TILE_RADIUS = 16;

/** Enlarged single-card tile dimensions (pt) and its own aspect ratio. */
export const SINGLE_TILE_WIDTH = 220;
export const SINGLE_TILE_HEIGHT = 180;

/** Enlarged single-card tile corner radius (pt). Fixed. */
export const SINGLE_TILE_RADIUS = 20;

/** Smallest width or height we will ever hand a tile, so a degenerate viewport can't go negative. */
const MIN_TILE_DIMENSION = 1;

/**
 * Floor a computed tile dimension at `MIN_TILE_DIMENSION`.
 *
 * The `Number.isFinite` guard is deliberate and not redundant with `Math.max`:
 * `Math.max(1, NaN)` is `NaN`, so a non-finite input would otherwise propagate
 * straight into a style value as a silent `NaN` width rather than clamping.
 * `useWindowDimensions()` always reports finite numbers, so this is defence in
 * depth for a module whose whole job is to be the one trustworthy source of these
 * numbers.
 */
const toTileDimension = (value: number): number =>
  Number.isFinite(value) ? Math.max(MIN_TILE_DIMENSION, value) : MIN_TILE_DIMENSION;

/**
 * Width (pt) for one tile in the 2-column grid at the given window width.
 *
 * `floor((W − 48) / 2)` — exactly the space FlashList leaves inside a cell once
 * `LIST_CONTENT_PADDING` and the wrapper's `GUTTER / 2` are spent. Flooring
 * guarantees the fit can never fail to a sub-pixel.
 *
 * Returns exactly `TILE_WIDTH` (171) at the 390 dp reference width, so the grid
 * is visually unchanged there.
 */
export const getGridTileWidth = (windowWidth: number): number =>
  toTileDimension(
    Math.floor((windowWidth - 2 * LIST_CONTENT_PADDING - NUM_COLUMNS * GUTTER) / NUM_COLUMNS)
  );

/**
 * Height (pt) for a grid tile of the given width, at the design aspect ratio
 * (140 / 171). Rounded rather than floored — height has no fit constraint, so
 * rounding stays closest to the ratio.
 */
export const getGridTileHeight = (tileWidth: number): number =>
  toTileDimension(Math.round((tileWidth * TILE_HEIGHT) / TILE_WIDTH));

/**
 * Width (pt) for the enlarged single-card tile, clamped to the space inside the
 * screen margins.
 *
 * Defensive only: 220 pt fits inside every shipped phone width (the clamp would
 * need a viewport below 252 dp to engage), so this returns 220 in practice. It
 * exists so the overlap class of bug cannot reappear via the single-card path.
 * Floored like the grid width, so a fractional reported viewport cannot yield a
 * fractional tile.
 */
export const getSingleTileWidth = (windowWidth: number): number =>
  toTileDimension(Math.floor(Math.min(SINGLE_TILE_WIDTH, windowWidth - 2 * SCREEN_MARGIN)));

/**
 * Height (pt) for the enlarged single-card tile, preserving its own 220 : 180
 * ratio if the width ever clamps.
 */
export const getSingleTileHeight = (tileWidth: number): number =>
  toTileDimension(Math.round((tileWidth * SINGLE_TILE_HEIGHT) / SINGLE_TILE_WIDTH));
