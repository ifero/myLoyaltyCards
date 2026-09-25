/**
 * Fill SVG path outlines, analytically antialiased, with no dependencies.
 *
 * WHY THIS EXISTS
 *
 * `scripts/build-brand-icons.mjs` renders the Cardì mark from signed distance
 * fields, which is exact and cheap because the mark is made of rounded rects and
 * an SDF is closed-form for those. The store banners need something the mark does
 * not: the **wordmark**, four Space Grotesk letterforms converted to outlines
 * (`brand-wordmark.mjs`). A glyph is quadratic Bézier contours with counters, and
 * there is no closed-form distance for that — so the banners need a fill
 * rasteriser rather than a distance field.
 *
 * The repo has no image library: sharp, rsvg-convert, ImageMagick, Inkscape,
 * cairo and pyobjc are all absent and Chrome is not installed for Playwright.
 * That is a deliberate constraint — it is what lets CI verify the committed
 * artwork byte for byte on a Linux runner — so this stays dependency-free too.
 *
 * HOW IT WORKS
 *
 * Signed-area accumulation, the algorithm FreeType's smooth renderer and font-rs
 * both use. Each edge deposits, into a per-row buffer, the DERIVATIVE along x of
 * the signed area it sweeps; a prefix sum across the row turns those deltas back
 * into coverage. Two properties are why it is the right choice here:
 *
 *   - Antialiasing is EXACT for a polygon, in both axes at once, from one pass.
 *     Supersampling would quantise it and cost 16-64x the work; the mark's SDF
 *     renderer makes the same argument for its own primitives.
 *   - Winding cancels by construction. A TrueType glyph draws its outer contour
 *     and its counters in opposite directions, so `d` and `a` come out with holes
 *     without the rasteriser needing an inside/outside test at all.
 *
 * It is NOT a general SVG renderer, in exactly the sense `build-brand-icons.mjs`
 * means it: {@link flattenPath} throws on any command it was not written for
 * rather than approximating it, so a path this cannot draw fails the build
 * instead of shipping the wrong shape.
 */

/** Maximum deviation, in device pixels, allowed between a curve and its polyline. */
const DEFAULT_TOLERANCE = 0.02;

/**
 * Upper bound on segments per curve.
 *
 * Never reached in practice. Measured at the largest scale this repo draws at —
 * the 4096 px developer-page header, where the wordmark runs 5.29 device pixels to
 * the em unit — the worst curve in `Card` asks for 26, and 15 on the 1024 px
 * feature graphic. It is a guard against a degenerate control polygon producing a
 * pathological count, not a quality knob.
 *
 * ⚠️ Those counts come from flattening ever-growing PREFIXES of the real glyph
 * paths through `flattenPath` itself. Re-deriving them from `segmentsFor` by hand
 * gave 14 rather than 15 for the feature graphic, because a single `Q` command can
 * carry several implicit quadratics — so measure through the real code path, not a
 * reimplementation of it.
 */
const MAX_SEGMENTS = 256;

/** `d` command letters, upper and lower case, that {@link flattenPath} implements. */
const SUPPORTED = new Set(['M', 'L', 'H', 'V', 'Q', 'C', 'Z']);

/** Split a `d` attribute into `{ command, args }` steps. */
const tokenize = (d) => {
  const steps = [];
  // A command letter, then every number up to the next letter. SVG numbers may
  // be separated by whitespace, commas, or nothing at all when the sign or the
  // decimal point already ends the previous one ("1.5.5" is two numbers), which
  // is why the numbers are matched rather than split.
  const commands = /([MmLlHhVvQqCcZzSsTtAa])([^MmLlHhVvQqCcZzSsTtAa]*)/g;
  let match = commands.exec(d);
  while (match !== null) {
    const args = (match[2].match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    steps.push({ command: match[1], args });
    match = commands.exec(d);
  }
  return steps;
};

/**
 * Segments needed so an n-segment polyline stays within `tolerance` of the curve.
 *
 * A chord's maximum deviation from the arc it spans is `|B''| * dt^2 / 8`, where
 * `dt` is the parameter interval it covers. With n equal intervals `dt = 1 / n`,
 * so `n = ceil(sqrt(|B''| / (8 * tolerance)))`.
 *
 * ⚠️ `maxSecondDerivative` is the second derivative of the CURVE, not the control
 * polygon's difference. For a quadratic `B'' = 2(P0 - 2P1 + P2)`, so the caller
 * must double the difference it computes; the factor is easy to drop, and
 * dropping it makes every curve come out exactly `sqrt(2)` too coarse — which is
 * invisible on screen and silently breaks the promise this tolerance makes.
 */
const segmentsFor = (maxSecondDerivative, tolerance) =>
  Math.min(MAX_SEGMENTS, Math.max(1, Math.ceil(Math.sqrt(maxSecondDerivative / (8 * tolerance)))));

/**
 * Flatten one SVG path into closed contours of device-pixel points.
 *
 * The transform is applied BEFORE flattening, not after, so `tolerance` means
 * what it says: a curve that will be drawn at 4096 px is subdivided for 4096 px,
 * and the same path at 48 px is not subdivided 85x more finely than it needs.
 *
 * @param {string} d SVG path data.
 * @param {{scale: number, dx: number, dy: number, tolerance?: number}} transform
 *   Uniform scale then translate, in device pixels.
 * @returns {{x: number, y: number}[][]} one array of points per subpath. Contours
 *   are implicitly closed — the rasteriser joins last to first — so `Z` adds no
 *   duplicate point.
 */
export const flattenPath = (d, { scale, dx, dy, tolerance = DEFAULT_TOLERANCE }) => {
  const contours = [];
  let points = null;
  // Current point, and the subpath's start, both in PATH units: relative commands
  // and the implicit `Z` close are defined there, so converting per point rather
  // than per command would round-trip through device space for no reason.
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const emit = (x, y) => {
    points.push({ x: x * scale + dx, y: y * scale + dy });
  };

  const open = (x, y) => {
    points = [];
    contours.push(points);
    startX = x;
    startY = y;
    emit(x, y);
  };

  /** Quadratic: `B'' = 2(P0 - 2P1 + P2)`, constant, so the bound is exact. */
  const quadratic = (x1, y1, x, y) => {
    const ddx = cx - 2 * x1 + x;
    const ddy = cy - 2 * y1 + y;
    const n = segmentsFor(2 * Math.hypot(ddx, ddy) * scale, tolerance);
    for (let i = 1; i <= n; i += 1) {
      const t = i / n;
      const u = 1 - t;
      emit(u * u * cx + 2 * u * t * x1 + t * t * x, u * u * cy + 2 * u * t * y1 + t * t * y);
    }
  };

  /**
   * Cubic: `B''` interpolates linearly between `6(P0 - 2P1 + P2)` and
   * `6(P1 - 2P2 + P3)`, so the larger of the two bounds it over the whole curve.
   */
  const cubic = (x1, y1, x2, y2, x, y) => {
    const a = Math.hypot(cx - 2 * x1 + x2, cy - 2 * y1 + y2);
    const b = Math.hypot(x1 - 2 * x2 + x, y1 - 2 * y2 + y);
    const n = segmentsFor(6 * Math.max(a, b) * scale, tolerance);
    for (let i = 1; i <= n; i += 1) {
      const t = i / n;
      const u = 1 - t;
      emit(
        u * u * u * cx + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x,
        u * u * u * cy + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y
      );
    }
  };

  for (const { command, args } of tokenize(d)) {
    const upper = command.toUpperCase();
    if (!SUPPORTED.has(upper)) {
      throw new Error(
        `path-raster: command "${command}" is not implemented. ` +
          'Convert it to M/L/H/V/Q/C/Z rather than teaching this an approximation.'
      );
    }
    const relative = command !== upper;
    if (upper === 'Z') {
      cx = startX;
      cy = startY;
      continue;
    }
    // One command letter may carry repeated argument groups ("L1 2 3 4" is two
    // lineto's), and a repeated `M` means moveto once then lineto — per SVG 1.1.
    const arity = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6 }[upper];
    if (args.length === 0 || args.length % arity !== 0) {
      throw new Error(
        `path-raster: "${command}" got ${args.length} arguments, expected a multiple of ${arity}`
      );
    }
    for (let i = 0; i < args.length; i += arity) {
      const group = args.slice(i, i + arity);
      if (upper === 'M' || upper === 'L') {
        const x = relative ? cx + group[0] : group[0];
        const y = relative ? cy + group[1] : group[1];
        if (upper === 'M' && i === 0) open(x, y);
        else emit(x, y);
        cx = x;
        cy = y;
      } else if (upper === 'H') {
        cx = relative ? cx + group[0] : group[0];
        emit(cx, cy);
      } else if (upper === 'V') {
        cy = relative ? cy + group[0] : group[0];
        emit(cx, cy);
      } else if (upper === 'Q') {
        const [ax, ay, bx, by] = relative
          ? [cx + group[0], cy + group[1], cx + group[2], cy + group[3]]
          : group;
        quadratic(ax, ay, bx, by);
        cx = bx;
        cy = by;
      } else {
        const [ax, ay, bx, by, ex, ey] = relative
          ? [
              cx + group[0],
              cy + group[1],
              cx + group[2],
              cy + group[3],
              cx + group[4],
              cy + group[5]
            ]
          : group;
        cubic(ax, ay, bx, by, ex, ey);
        cx = ex;
        cy = ey;
      }
    }
  }
  return contours.filter((contour) => contour.length > 2);
};

/**
 * Deposit one edge's signed-area derivative into the accumulation buffer.
 *
 * `x` is clamped to the canvas rather than the column INDEX being clamped: an
 * edge left of the canvas should leave column 0 fully covered, and moving the
 * edge to x=0 is exactly that, whereas clamping the index would pile the whole
 * trapezoid into one column and brighten it.
 */
const accumulateEdge = (buffer, stride, width, height, p0, p1) => {
  if (p0.y === p1.y) return; // Horizontal edges sweep no area.
  const descending = p0.y < p1.y;
  const top = descending ? p0 : p1;
  const bottom = descending ? p1 : p0;
  const dir = descending ? 1 : -1;
  const dxdy = (bottom.x - top.x) / (bottom.y - top.y);

  const firstRow = Math.max(0, Math.floor(top.y));
  const lastRow = Math.min(height, Math.ceil(bottom.y));

  for (let y = firstRow; y < lastRow; y += 1) {
    const yEnter = Math.max(y, top.y);
    const yExit = Math.min(y + 1, bottom.y);
    const dy = yExit - yEnter;
    if (dy <= 0) continue;
    const enter = Math.min(width, Math.max(0, top.x + (yEnter - top.y) * dxdy));
    const exit = Math.min(width, Math.max(0, top.x + (yExit - top.y) * dxdy));
    const d = dy * dir;
    const row = y * stride;
    const xLeft = Math.min(enter, exit);
    const xRight = Math.max(enter, exit);
    const leftFloor = Math.floor(xLeft);
    const rightCeil = Math.ceil(xRight);
    const first = leftFloor | 0;
    const last = rightCeil | 0;

    if (last <= first + 1) {
      // The edge stays inside one column: split `d` between that column and the
      // next by where its midpoint falls, which is the exact area either side.
      const mid = 0.5 * (enter + exit) - leftFloor;
      buffer[row + first] += d * (1 - mid);
      buffer[row + first + 1] += d * mid;
      continue;
    }
    // The edge crosses columns. `s` is the slope in x, so `d * s` is the area a
    // fully-crossed column receives; the two end columns get the partial
    // triangles the edge cuts out of them.
    const s = 1 / (xRight - xLeft);
    const leftFraction = xLeft - leftFloor;
    const headArea = 0.5 * s * (1 - leftFraction) * (1 - leftFraction);
    const rightFraction = xRight - rightCeil + 1;
    const tailArea = 0.5 * s * rightFraction * rightFraction;
    buffer[row + first] += d * headArea;
    if (last === first + 2) {
      buffer[row + first + 1] += d * (1 - headArea - tailArea);
    } else {
      const secondArea = s * (1.5 - leftFraction);
      buffer[row + first + 1] += d * (secondArea - headArea);
      for (let x = first + 2; x < last - 1; x += 1) buffer[row + x] += d * s;
      const beforeTail = secondArea + (last - first - 3) * s;
      buffer[row + last - 1] += d * (1 - beforeTail - tailArea);
    }
    buffer[row + last] += d * tailArea;
  }
};

/**
 * Rasterise closed contours into per-pixel coverage in 0..1.
 *
 * Coverage is `|winding-weighted area|` clamped to 1, which is the non-zero fill
 * rule for any outline whose contours do not self-overlap — true of every glyph,
 * because a counter is drawn the opposite way round from the shape it sits in.
 *
 * @param {{x: number, y: number}[][]} contours device-pixel points.
 * @returns {Float32Array} `width * height` coverages, row-major.
 */
export const rasterizeContours = (contours, width, height) => {
  // Two slack columns: an edge landing exactly on the right border deposits its
  // tail at index `width`, and the single-column branch writes `first + 1`.
  const stride = width + 2;
  const buffer = new Float64Array(stride * height);
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i += 1) {
      accumulateEdge(buffer, stride, width, height, contour[i], contour[(i + 1) % contour.length]);
    }
  }
  const coverage = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    // The running sum restarts every row. Carrying it across the whole buffer
    // (as font-rs does) is equivalent only while every contour closes inside the
    // canvas; restarting makes a clipped edge cost one row instead of every row
    // below it.
    let running = 0;
    const row = y * stride;
    const out = y * width;
    for (let x = 0; x < width; x += 1) {
      running += buffer[row + x];
      const value = running < 0 ? -running : running;
      coverage[out + x] = value > 1 ? 1 : value;
    }
  }
  return coverage;
};

/** Flatten several paths under one transform and rasterise them as a single fill. */
export const fillPaths = (paths, width, height, transform) =>
  rasterizeContours(
    paths.flatMap((d) => flattenPath(d, transform)),
    width,
    height
  );
