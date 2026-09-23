/**
 * @jest-environment node
 */
// Unit tests for the analytic fill rasteriser behind the store banners (Story 21.5).
//
// WHY A SUBPROCESS: path-raster.mjs is a plain Node ESM module in scripts/, and Jest compiles
// through babel.config.test.js, which targets Hermes/React Native and emits CommonJS;
// `moduleFileExtensions` also omits `mjs`. Every case is therefore evaluated in one real
// `node --input-type=module` child — the pattern build-path-filters.test.js, story-refs.test.js
// and signing-fingerprints.test.js already use.
//
// WHY THIS FILE EARNS ITS KEEP: the assertions are on AREA, not on eyeballed pixels. A fill
// rasteriser that is merely "close" is indistinguishable from a correct one by looking, and
// `yarn icons:check` would then defend the error forever — the committed store artwork is a
// byte-comparison against whatever this produces. Area is the property that cannot be fudged:
// a shape's total coverage is its geometry, so a half-pixel bias anywhere shows up as a number.

const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./path-raster.mjs')).href;

const AT_1X = { scale: 1, dx: 0, dy: 0 };

/** A rectangle, wound clockwise on screen (y down). */
const rect = (x0, y0, x1, y1) => `M${x0} ${y0} L${x1} ${y0} L${x1} ${y1} L${x0} ${y1} Z`;
/** The same rectangle wound the other way — a counter, which cuts a hole. */
const hole = (x0, y0, x1, y1) => `M${x0} ${y0} L${x0} ${y1} L${x1} ${y1} L${x1} ${y0} Z`;

/**
 * A circle from eight quadratic arcs, via each 45° arc's tangent-intersection control point
 * (radius / cos 22.5° along the bisector). Its area is known exactly, which is what makes it a
 * test of the CURVE path rather than of the straight-edge path.
 */
const circle = (cx, cy, r) => {
  const out = [`M${cx + r} ${cy}`];
  for (let i = 0; i < 8; i += 1) {
    const mid = ((i + 0.5) * Math.PI) / 4;
    const end = ((i + 1) * Math.PI) / 4;
    const k = r / Math.cos(Math.PI / 8);
    out.push(
      `Q${cx + k * Math.cos(mid)} ${cy + k * Math.sin(mid)} ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)}`
    );
  }
  return `${out.join(' ')} Z`;
};

/**
 * The area {@link circle} actually encloses, in closed form.
 *
 * Regular n-gon through the arc endpoints, plus each arc's bulge past its chord.
 * Archimedes gives that bulge exactly: a parabolic segment is two thirds of the
 * triangle on the same chord, and a quadratic Bézier is a parabola.
 */
const splineArea = (n, r) => {
  const chord = 2 * r * Math.sin(Math.PI / n);
  const apex = r * (1 / Math.cos(Math.PI / n) - Math.cos(Math.PI / n));
  return n * 0.5 * r * r * Math.sin((2 * Math.PI) / n) + n * (2 / 3) * 0.5 * chord * apex;
};

const EXACT_SPLINE_AREA = splineArea(8, 40);

// Each case either calls an export directly (`call`) or fills paths and reports the area, some
// probed pixels and optionally one whole row. Evaluated in order, in one child.
const CASES = [
  // --- flattenPath: structure -------------------------------------------------
  {
    name: 'flatten: closes without a duplicate point',
    call: 'flattenPath',
    args: ['M0 0 L4 0 L4 4 L0 4 Z', AT_1X]
  },
  { name: 'flatten: implicit repeat', call: 'flattenPath', args: ['M0 0 L4 0 4 4 0 4 Z', AT_1X] },
  { name: 'flatten: relative', call: 'flattenPath', args: ['m1 1 l4 0 l0 4 l-4 0 z', AT_1X] },
  { name: 'flatten: absolute twin', call: 'flattenPath', args: ['M1 1 L5 1 L5 5 L1 5 Z', AT_1X] },
  { name: 'flatten: H and V', call: 'flattenPath', args: ['M1 1 H5 V5 H1 Z', AT_1X] },
  { name: 'flatten: curve at 1x', call: 'flattenPath', args: ['M0 0 Q5 10 10 0 Z', AT_1X] },
  {
    name: 'flatten: curve at 64x',
    call: 'flattenPath',
    args: ['M0 0 Q5 10 10 0 Z', { scale: 64, dx: 0, dy: 0 }]
  },
  { name: 'flatten: arc refused', call: 'flattenPath', args: ['M0 0 A5 5 0 0 1 10 0 Z', AT_1X] },
  { name: 'flatten: smooth curve refused', call: 'flattenPath', args: ['M0 0 S5 5 10 0 Z', AT_1X] },
  { name: 'flatten: bad arity refused', call: 'flattenPath', args: ['M0 0 L4', AT_1X] },

  // --- fill: exact area -------------------------------------------------------
  {
    name: 'fill: pixel-aligned rectangle',
    paths: [rect(2, 1, 6, 5)],
    width: 8,
    height: 8,
    probes: [
      [2, 1],
      [2, 0],
      [6, 1],
      [5, 4]
    ]
  },
  { name: 'fill: half-pixel edges', paths: [rect(0.5, 0, 3.5, 1)], width: 4, height: 1, row: 0 },
  {
    // A right triangle over the whole canvas: area w*h/2, and the pixel the
    // hypotenuse bisects is exactly half covered — one number that pins both axes.
    name: 'fill: diagonal',
    paths: ['M0 0 L16 16 L0 16 Z'],
    width: 16,
    height: 16,
    probes: [[8, 8]]
  },
  {
    name: 'fill: counter cuts a hole',
    paths: [rect(0, 0, 10, 10), hole(3, 3, 7, 7)],
    width: 10,
    height: 10,
    probes: [
      [5, 5],
      [0, 0]
    ]
  },
  {
    // Non-zero winding SATURATES rather than summing, which is what keeps a
    // glyph's overlapping stems from burning through a composite.
    name: 'fill: same-winding overlap saturates',
    paths: [rect(0, 0, 6, 6), rect(3, 3, 9, 9)],
    width: 12,
    height: 12,
    probes: [[4, 4]]
  },
  {
    name: 'fill: clipped off two edges',
    paths: [rect(-5, -5, 4, 4)],
    width: 8,
    height: 8,
    probes: [
      [0, 0],
      [7, 0],
      [7, 4],
      [7, 7]
    ]
  },
  {
    name: 'fill: contour direction is irrelevant alone',
    paths: [rect(1, 1, 5, 5)],
    width: 8,
    height: 8
  },
  { name: 'fill: reversed twin', paths: [hole(1, 1, 5, 5)], width: 8, height: 8 },
  { name: 'fill: circle from quadratics', paths: [circle(64, 64, 40)], width: 128, height: 128 },
  {
    // The transform is applied BEFORE flattening, so a shape drawn small and one
    // drawn large agree on area up to the scale factor rather than the large one
    // being under-subdivided.
    name: 'fill: circle scaled 4x',
    paths: [circle(16, 16, 10)],
    width: 128,
    height: 128,
    transform: { scale: 4, dx: 0, dy: 0 }
  },
  {
    name: 'fill: translation moves ink without changing its area',
    paths: [rect(0, 0, 4, 4)],
    width: 16,
    height: 16,
    transform: { scale: 1, dx: 6.5, dy: 2 },
    probes: [
      [6, 2],
      [10, 2],
      [0, 0]
    ]
  }
];

/** Evaluate every case in one child process; return name -> value (or {error}). */
const runCases = () => {
  const harness = `
    import * as mod from ${JSON.stringify(MODULE_URL)};
    const cases = JSON.parse(process.env.CASES_JSON);
    const total = (coverage) => coverage.reduce((sum, value) => sum + value, 0);
    process.stdout.write(
      JSON.stringify(
        cases.map((testCase) => {
          try {
            if (testCase.call) return { value: mod[testCase.call](...testCase.args) };
            const { paths, width, height } = testCase;
            const coverage = mod.fillPaths(paths, width, height, testCase.transform ?? { scale: 1, dx: 0, dy: 0 });
            return {
              value: {
                area: total(coverage),
                probes: (testCase.probes ?? []).map(([x, y]) => coverage[y * width + x]),
                row: testCase.row === undefined
                  ? null
                  : Array.from(coverage.slice(testCase.row * width, (testCase.row + 1) * width))
              }
            };
          } catch (err) {
            return { error: String(err && err.message ? err.message : err) };
          }
        })
      )
    );
  `;

  let stdout;
  try {
    stdout = execFileSync(process.execPath, ['--input-type=module', '-e', harness], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CASES_JSON: JSON.stringify(CASES) }
    });
  } catch (err) {
    throw new Error(`path-raster harness failed:\n${err.stderr || err.message}`);
  }
  const results = JSON.parse(stdout);
  return Object.fromEntries(CASES.map(({ name }, i) => [name, results[i]]));
};

describe('path-raster', () => {
  let r;

  beforeAll(() => {
    r = runCases();
  });

  const value = (name) => {
    if (r[name].error) throw new Error(`case "${name}" threw: ${r[name].error}`);
    return r[name].value;
  };
  const error = (name) => r[name].error;

  describe('flattenPath', () => {
    it('returns one contour per subpath, closed without repeating its first point', () => {
      // A duplicate closing point would give the rasteriser a zero-length edge to
      // divide by; the contour is implicitly closed instead.
      expect(value('flatten: closes without a duplicate point')).toEqual([
        [
          { x: 0, y: 0 },
          { x: 4, y: 0 },
          { x: 4, y: 4 },
          { x: 0, y: 4 }
        ]
      ]);
    });

    it('reads repeated argument groups as repeated commands', () => {
      expect(value('flatten: implicit repeat')).toEqual(
        value('flatten: closes without a duplicate point')
      );
    });

    it('reads relative commands, including H and V', () => {
      expect(value('flatten: relative')).toEqual(value('flatten: absolute twin'));
      expect(value('flatten: H and V')).toEqual(value('flatten: absolute twin'));
    });

    it('subdivides for the size the curve will be DRAWN at, not for its own units', () => {
      // Tolerance is in device pixels, so the transform has to be applied first.
      // Flattening in path units and scaling afterwards would give these two the
      // same segment count and visibly facet the 64x one.
      expect(value('flatten: curve at 64x')[0].length).toBeGreaterThan(
        value('flatten: curve at 1x')[0].length
      );
    });

    it('refuses a command it cannot draw exactly rather than approximating it', () => {
      expect(error('flatten: arc refused')).toMatch(/not implemented/);
      expect(error('flatten: smooth curve refused')).toMatch(/not implemented/);
    });

    it('refuses an argument count that does not fit the command', () => {
      expect(error('flatten: bad arity refused')).toMatch(/expected a multiple of 2/);
    });
  });

  describe('fillPaths', () => {
    it('fills a pixel-aligned rectangle solidly, and nothing outside it', () => {
      const { area, probes } = value('fill: pixel-aligned rectangle');
      expect(area).toBeCloseTo(16, 6);
      expect(probes).toEqual([1, 0, 0, 1]);
    });

    it('antialiases a half-pixel edge to exactly half coverage', () => {
      expect(value('fill: half-pixel edges').row).toEqual([0.5, 1, 1, 0.5]);
    });

    it('gets a diagonal exactly right in both axes from one pass', () => {
      const { area, probes } = value('fill: diagonal');
      expect(area).toBeCloseTo(128, 4);
      expect(probes[0]).toBeCloseTo(0.5, 4);
    });

    it('leaves a counter-wound contour as a hole', () => {
      const { area, probes } = value('fill: counter cuts a hole');
      expect(area).toBeCloseTo(100 - 16, 5);
      expect(probes).toEqual([0, 1]);
    });

    it('saturates rather than doubling where two same-wound contours overlap', () => {
      const { area, probes } = value('fill: same-winding overlap saturates');
      expect(area).toBeCloseTo(36 + 36 - 9, 5);
      expect(probes[0]).toBeCloseTo(1, 6);
    });

    it('clips geometry running off the canvas instead of wrapping it into the next row', () => {
      const { area, probes } = value('fill: clipped off two edges');
      expect(area).toBeCloseTo(16, 5);
      // Full coverage at the clipped corner, and nothing leaked down the far column.
      expect(probes).toEqual([1, 0, 0, 0]);
    });

    it('does not care which way round a lone contour is drawn', () => {
      expect(value('fill: contour direction is irrelevant alone').area).toBeCloseTo(
        value('fill: reversed twin').area,
        9
      );
    });

    it('reproduces the quadratic spline’s exact area, erring INWARD', () => {
      // The reference is the SPLINE's area, not pi*r^2: eight quadratic arcs
      // through their tangent-intersection control points bulge slightly outside
      // the circle they approximate (5043.1 against 5026.5 at r=40), so testing
      // against the circle would be testing the wrong shape.
      //
      // Two contracts in one number. Flattening a convex curve into chords cuts
      // corners off it, so the result must land just BELOW the spline — a
      // rasteriser that double-counted an edge, or carried a half-pixel bias,
      // would overshoot instead, and no amount of looking would show it.
      const { area } = value('fill: circle from quadratics');
      expect(area).toBeLessThan(EXACT_SPLINE_AREA);
      expect(EXACT_SPLINE_AREA - area).toBeLessThan(EXACT_SPLINE_AREA * 0.0025);
    });

    it('draws a small path scaled up identically to a large one drawn 1:1', () => {
      // Tolerance lives in DEVICE pixels, so a 10-unit circle at 4x and a 40-unit
      // circle at 1x get the same subdivision and must agree EXACTLY. Flattening
      // in path units first would under-subdivide the small one and this would
      // drift — which is the bug that would otherwise only show at 4096 px.
      expect(value('fill: circle scaled 4x').area).toBe(value('fill: circle from quadratics').area);
    });

    it('translates by fractional pixels without gaining or losing ink', () => {
      const { area, probes } = value('fill: translation moves ink without changing its area');
      expect(area).toBeCloseTo(16, 5);
      expect(probes).toEqual([0.5, 0.5, 0]);
    });
  });
});
