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
 *
 * ## The second invariant: inside the tile
 *
 * Letting the tile track the viewport moved the same class of bug one level down.
 * `CardTile`'s fallback children were *also* frozen measurements — `logoSlot` 64 pt
 * and `avatarCircle` 48 pt, both centre-aligned — while `favouriteBadge` is pinned
 * to the right edge. At a fixed 171 pt tile they could never meet; on a narrower
 * tile they can, and a 3-column grid (≈116 pt at 412 dp) would reach it.
 *
 * So this module owns a second relationship, `getFallbackChildMetrics`: a centred
 * child is sized *from* the tile and capped so it cannot reach the badge. Same
 * lesson as above — the invariant is "the child clears the badge", not "the child
 * is 64 pt".
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

// ─── Intra-tile geometry: the centred fallback children vs the pinned badge ───

/**
 * Favourite-badge geometry (pt), mirrored from `CardTile`'s `favouriteBadge` style.
 *
 * Deliberately **not** proportional to the tile, and that is a design decision
 * rather than an oversight. The badge is an affordance, not decoration: it wraps a
 * 16 pt star in a near-opaque white plate so the amber glyph stays legible on any
 * brand colour, including the light and yellow ones. Shrinking it with the tile
 * would attack the legibility it exists to provide, and 24 pt is already at the
 * small end of a comfortable target. So the badge holds its size and the *centred*
 * children give way around it — see `getFallbackChildMetrics`.
 */
export const BADGE_SIZE = 24;
export const BADGE_INSET = 6;

/**
 * Smallest gap (pt) we leave between a centred child's right edge and the badge.
 *
 * Not zero: "does not overlap" and "reads as two separate elements" are different
 * bars. It also carries more weight than it looks, because the two stop being
 * *vertically* separated as the tile shrinks. At the 390 dp reference the 64 pt slot
 * starts 38 pt down and the badge ends at 30 pt, so they miss on both axes; on a
 * ≈116 pt tile the slot starts around 26 pt and the vertical ranges genuinely
 * overlap. Below roughly a 150 pt tile, horizontal clearance is the *only* thing
 * keeping them apart.
 */
export const BADGE_CLEARANCE = 4;

/**
 * Horizontal room (pt) a centre-aligned child must leave free so it cannot reach
 * the right-pinned badge.
 *
 * Derived rather than written as 68, for the same reason as `LIST_CONTENT_PADDING`:
 * the badge's style constants and this arithmetic must not be able to drift apart.
 * The doubling is not a safety margin — a centred child grows from its middle, so
 * every point of width costs half a point of clearance on *each* side. That factor
 * of two is exactly what makes the tile's own `0.85` logo factor unusable here:
 * `0.85 × T < T − 68` would need a tile wider than 450 pt.
 */
export const BADGE_KEEP_OUT = 2 * (BADGE_INSET + BADGE_SIZE + BADGE_CLEARANCE);

/**
 * Design-reference sizes (pt) of the two centred fallback children, measured at
 * `TILE_WIDTH`. Like `TILE_WIDTH` itself these are the *ratio source*, not applied
 * layout values — `getFallbackChildMetrics` produces those.
 */
export const LOGO_SLOT_SIZE = 64;
export const AVATAR_SIZE = 48;

/**
 * Glyph size (pt) inside those plates. Unlike the plate itself this is a *target*
 * rather than a ratio source: the type holds its design size wherever the plate can
 * contain it, so the abbreviation and the avatar letter stay consistent with the rest
 * of the app on every device that ships today, and shrink only where a capped plate
 * genuinely cannot hold them.
 */
export const FALLBACK_TEXT_SIZE = 18;

/**
 * Plate needed per point of type, as a multiple of the font size.
 *
 * React Native offers no synchronous text-measurement API, so this is a deliberately
 * conservative estimate rather than a measurement. Two components: the widest case is
 * the brand abbreviation's *two* uppercase glyphs at ≈0.65 em of advance each (≈1.3 em
 * total, wider than the ≈1.2 em line box), plus a little padding so the glyph is not
 * flush against the plate's edge. Erring high only shrinks type a step early; erring
 * low would let it spill outside the plate, which is the visible failure.
 */
const FALLBACK_TEXT_FIT_RATIO = 1.45;

/**
 * Floor for the glyph — `TYPOGRAPHY.caption2`, the smallest size the design system
 * ships. Taken from the scale rather than invented, though not imported: this module
 * is deliberately dependency-free pure arithmetic. It outranks the fit ratio, so a
 * degenerately small plate gets unreadably-but-honestly clipped type rather than type
 * scaled below the point of being type.
 *
 * There is deliberately **no matching floor on the plate itself**, and that is a
 * finding rather than an omission. A size floor could never bind: it would need the
 * proportional size to fall under it (a tile below ~63 pt) while the badge keep-out
 * still permitted it (a tile above 92 pt), and those ranges do not intersect. Adding
 * one would be unreachable code that also, where it *did* apply, ate the very
 * clearance the cap exists to protect — at an 85 pt tile a 24 pt floor leaves a
 * 0.5 pt gap instead of 4. The keep-out cap is therefore the effective minimum, and
 * keeping plates from getting absurdly small in the first place is the job of
 * whoever chooses the column count (a minimum *tile* width), not of this function.
 */
const MIN_FALLBACK_TEXT_SIZE = 11;

/** Applied size of one centred fallback child, plus the glyph size that fits it. */
export interface FallbackChildMetrics {
  /** Side length (pt) of the plate. */
  size: number;
  /** Glyph size (pt) for the text centred inside it. */
  fontSize: number;
}

/**
 * Size a centred fallback child (`logoSlot` or `avatarCircle`) for a tile of the
 * given width, so that it tracks the tile and can never reach the favourite badge.
 *
 * Two constraints:
 *
 * 1. **Proportional** — `round(tileWidth × referenceSize / TILE_WIDTH)`, so the child
 *    keeps its share of the tile at every width and reproduces the reference size
 *    *exactly* at 390 dp (64 and 48), leaving that viewport pixel-identical.
 * 2. **Capped** at `tileWidth − BADGE_KEEP_OUT`, so it cannot reach the badge.
 *
 * The cap is the whole point, because proportionality alone is *not* sufficient:
 * `logoSlot`'s 64/171 share only clears the badge above a ≈96 pt tile, and a
 * 3-column grid on a 320 dp phone (85 pt) breaches it. Clamping makes the clearance
 * hold by construction rather than holding for as long as nobody picks an unlucky
 * column count — the same reason `getGridTileWidth` floors rather than trusting 171.
 *
 * The cap is slack at every width that ships today: it binds only below a ≈109 pt
 * tile, so on real 2-column phones (136 pt at 320 dp and up) pure proportionality is
 * what you see.
 *
 * Clearance is at least `BADGE_CLEARANCE` for any tile of 69 pt or more — below that
 * the cap would ask for a sub-1 pt plate and `toTileDimension`'s 1 pt floor takes
 * over, which still clears down to 61 pt but by less than the nominal gap. At 60 pt
 * and below the badge's own 30 pt footprint has crossed the tile's centre line, so
 * *no* centred child can clear it and the badge itself would have to change — see
 * `BADGE_SIZE`. That is a ≈168 dp 2-column viewport: unreachable, and swept in
 * `gridLayout.test.ts` so all three thresholds are stated contracts rather than
 * discovered surprises.
 *
 * The **glyph** follows a different rule from the plate on purpose: it holds
 * `FALLBACK_TEXT_SIZE` wherever the plate can contain it and shrinks only when the cap
 * has taken the plate below that, so type stays consistent with the rest of the app on
 * every device that ships today. It never scales *up* either — a wider tile gets a
 * larger plate with the same 18 pt letters in it.
 *
 * The plate's corner radius is deliberately left fixed, consistent with the same
 * decision for `TILE_RADIUS`.
 */
export const getFallbackChildMetrics = (
  tileWidth: number,
  referenceSize: number
): FallbackChildMetrics => {
  const proportional = Math.round((tileWidth * referenceSize) / TILE_WIDTH);
  const size = toTileDimension(Math.min(proportional, tileWidth - BADGE_KEEP_OUT));

  // The glyph keeps its design size wherever the plate can hold it, and shrinks to fit
  // only once the badge cap has taken the plate below that. It is measured against the
  // PLATE rather than the tile, because the plate is what has to contain it.
  return {
    size,
    fontSize: toTileDimension(
      Math.min(
        FALLBACK_TEXT_SIZE,
        Math.max(MIN_FALLBACK_TEXT_SIZE, Math.floor(size / FALLBACK_TEXT_FIT_RATIO))
      )
    )
  };
};
