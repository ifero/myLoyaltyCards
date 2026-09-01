#!/usr/bin/env node
/**
 * Build every shipped Cardì brand asset from ONE geometry definition.
 *
 *   yarn icons:build     write the assets
 *   yarn icons:check     fail if any is out of sync (pre-push + CI)
 *
 * WHAT IT PRODUCES
 *
 *   assets/images/cardi-mark.svg        the mark, transparent — the in-app source
 *   assets/icon.png              1024   opaque ink field; iOS and Android mask it themselves
 *   assets/adaptive-icon.png     1024   Android foreground, transparent, scaled to the safe zone
 *   assets/adaptive-icon-monochrome.png
 *                                1024   Android 13+ themed layer: one colour, transparent
 *   assets/favicon.png             48   opaque
 *   assets/splash-icon.png       1024   transparent; the field comes from the splash config
 *
 * WHY THERE IS A RASTERISER IN HERE
 *
 * This repo has no image library and no rasteriser — sharp, rsvg-convert,
 * ImageMagick, Inkscape and pyobjc are all absent, and Chrome is not installed
 * for Playwright. `build-splash-icon.mjs` (which this supersedes) established the
 * answer: draw the handful of primitives the artwork actually uses via signed
 * distance fields, take antialiasing analytically from the distance rather than by
 * supersampling, and write the PNG by hand. Cheaper and cleaner than supersampling,
 * and it keeps the build dependency-free so CI can verify it.
 *
 * The Cardì mark needs exactly two primitives: a rounded rect, and a ROTATED
 * rounded rect. Rotation is applied to the sample point rather than the shape,
 * which is exact — rotation is an isometry, so it preserves the distance the SDF
 * returns. Scaling is applied to the shape instead, because scaling a rounded rect
 * about a point yields another rounded rect exactly, and transforming the sample
 * point would have left the returned distance in the scaled space and skewed the
 * antialiasing.
 *
 * It is NOT a general SVG renderer. If the mark ever gains a primitive this does
 * not know about, this script must be updated; it will not silently approximate.
 *
 * WHY THE SVG IS GENERATED TOO
 *
 * `build-splash-icon.mjs` transcribed its geometry from a hand-authored SVG and
 * carried an `assertSvgMatches` drift check to catch the transcription going
 * stale. Generating both from the same constants removes the failure mode instead
 * of detecting it: there is no second copy of the numbers to drift.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// THE MARK, in the design system's own em space: 100 units to the em, the
// glyph's baseline at y=70. These are the numbers in docs/design/cardi/, not a
// separate set that happens to look the same — variant C of
// docs/design/cardi/frames/cardi-icon-explore.html.
// ---------------------------------------------------------------------------
const BASELINE = 70;
const XHEIGHT = 49.6;
const STEM_TOP = BASELINE - XHEIGHT; // 20.4
const CX = 15; // half the ì's 30-unit advance

/**
 * The accent DESCENDS left to right: a grave, which is what "Cardì" spells.
 * Positive is the correct sign because SVG's y-axis points down. A negative
 * angle draws an acute and spells a different word — see
 * docs/design/cardi/cardi-design-system.md.
 */
const ANGLE = 35;

/** Variant C: the beam crosses the bars HIGH, where an accent belongs. */
const BEAM = { length: 52, weight: 9, cy: 30 };

/** The stem is a barcode: three bars of different widths. */
const BARS = [
  { x: CX - 11, w: 4.5, r: 2.2 },
  { x: CX - 4.5, w: 9, r: 4.5 },
  { x: CX + 7, w: 4, r: 2 }
];

const INK = [0x18, 0x18, 0x24];
const BEAM_YELLOW = [0xfc, 0xcc, 0x0c];
const WHITE = [0xff, 0xff, 0xff];

/** Android crops the adaptive foreground to the centre 66%. iOS has no such mask. */
const SAFE_FRACTION = 0.66;
/** The icon canvas, in em units. 100 puts the mark at ~76% of the frame. */
const CANVAS = 100;

// ---------------------------------------------------------------------------
// Derived geometry. Everything below falls out of the constants above, so
// changing the artwork updates the SVG, every PNG, and the Android scale
// together — there is no hardcoded scale factor to go quietly stale.
// ---------------------------------------------------------------------------
const rad = (deg) => (deg * Math.PI) / 180;

/** Half-extents of a rounded bar of this length and weight after rotation. */
const beamExtent = () => ({
  hw: (BEAM.length / 2) * Math.cos(rad(ANGLE)) + (BEAM.weight / 2) * Math.sin(rad(ANGLE)),
  hh: (BEAM.length / 2) * Math.sin(rad(ANGLE)) + (BEAM.weight / 2) * Math.cos(rad(ANGLE))
});

const bounds = () => {
  const { hw, hh } = beamExtent();
  const x0 = Math.min(CX - hw, BARS[0].x);
  const x1 = Math.max(CX + hw, BARS[2].x + BARS[2].w);
  const y0 = Math.min(BEAM.cy - hh, STEM_TOP);
  const y1 = Math.max(BEAM.cy + hh, BASELINE);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  let radius = 0;
  for (const px of [x0, x1]) {
    for (const py of [y0, y1]) radius = Math.max(radius, Math.hypot(px - cx, py - cy));
  }
  return { x0, x1, y0, y1, cx, cy, radius };
};

const B = bounds();

/**
 * How far the Android foreground must shrink for the whole mark to clear the
 * safe circle. Clamped at 1 because this may only ever reduce: "scale up to
 * fill the safe circle" is a different instruction from "fit inside it".
 */
const ANDROID_SCALE = Math.min(1, (SAFE_FRACTION * CANVAS) / 2 / B.radius);

/** em units -> canvas units, with the mark centred. */
const originX = B.cx - CANVAS / 2;
const originY = B.cy - CANVAS / 2;

/** Scaling a rounded rect about a point yields another rounded rect, exactly. */
const scaleRect = (rect, s) => ({
  x: B.cx + (rect.x - B.cx) * s,
  y: B.cy + (rect.y - B.cy) * s,
  w: rect.w * s,
  h: rect.h * s,
  r: rect.r * s
});

/** The four shapes, in canvas units, at a given scale. */
const shapes = (scale) => {
  const bars = BARS.map((bar) =>
    scaleRect({ x: bar.x, y: STEM_TOP, w: bar.w, h: BASELINE - STEM_TOP, r: bar.r }, scale)
  );
  const beam = scaleRect(
    {
      x: CX - BEAM.length / 2,
      y: BEAM.cy - BEAM.weight / 2,
      w: BEAM.length,
      h: BEAM.weight,
      r: BEAM.weight / 2
    },
    scale
  );
  const pivot = {
    x: B.cx + (CX - B.cx) * scale,
    y: B.cy + (BEAM.cy - B.cy) * scale
  };
  return { bars, beam, pivot };
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/** Signed distance to a rounded rect; negative inside. */
const roundedRectSdf = (px, py, { x, y, w, h, r }) => {
  const dx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const dy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  if (dx <= 0 && dy <= 0) return Math.max(dx, dy) - r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
};

/**
 * The same, rotated about `pivot`. The sample point is rotated by the INVERSE
 * angle into the rect's own frame; because rotation is an isometry the distance
 * that comes back is already correct in screen space, with no correction.
 */
const rotatedRoundedRectSdf = (px, py, rect, degrees, pivot) => {
  const a = rad(-degrees);
  const dx = px - pivot.x;
  const dy = py - pivot.y;
  return roundedRectSdf(
    pivot.x + dx * Math.cos(a) - dy * Math.sin(a),
    pivot.y + dx * Math.sin(a) + dy * Math.cos(a),
    rect
  );
};

/** Coverage in 0..1 from a signed distance — one-pixel-wide analytic AA. */
const coverage = (distance) => Math.min(1, Math.max(0, 0.5 - distance));

/**
 * Render one asset.
 *
 * `field` is the opaque background, or null for transparent. `stem` and `accent`
 * are the two ink colours; passing the same value for both is what produces the
 * Android themed layer, where there is no hue left to tell them apart.
 */
const render = ({ size, scale, field, stem, accent }) => {
  const { bars, beam, pivot } = shapes(scale);
  const px = Buffer.alloc(size * size * 4);
  const perPixel = CANVAS / size; // canvas units per device pixel

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Sample at the pixel CENTRE, in canvas units offset to the mark's frame.
      const sx = (x + 0.5) * perPixel + originX;
      const sy = (y + 0.5) * perPixel + originY;
      // The SDF is in canvas units; AA wants it in device pixels.
      const toPixels = 1 / perPixel;

      let r = field ? field[0] : 0;
      let g = field ? field[1] : 0;
      let b = field ? field[2] : 0;
      let a = field ? 1 : 0;

      const over = (colour, cov) => {
        if (cov <= 0) return;
        const outA = cov + a * (1 - cov);
        if (outA <= 0) return;
        r = (colour[0] * cov + r * a * (1 - cov)) / outA;
        g = (colour[1] * cov + g * a * (1 - cov)) / outA;
        b = (colour[2] * cov + b * a * (1 - cov)) / outA;
        a = outA;
      };

      for (const bar of bars) over(stem, coverage(roundedRectSdf(sx, sy, bar) * toPixels));
      over(accent, coverage(rotatedRoundedRectSdf(sx, sy, beam, ANGLE, pivot) * toPixels));

      const i = (y * size + x) * 4;
      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
};

// ---------------------------------------------------------------------------
// PNG encoding — carried over from build-splash-icon.mjs, parameterised by size
// ---------------------------------------------------------------------------
const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer) => {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
};

/**
 * Encode RGBA pixels, dropping the alpha channel when the asset is opaque.
 *
 * The colour type is not cosmetic. **iOS rejects an app icon that carries an
 * alpha channel**, so `icon.png` must be RGB; the splash and the Android
 * foreground are transparent marks on a field the platform paints, so they must
 * be RGBA. `constants.test.ts` asserts exactly that split, and it caught this
 * script writing RGBA for everything — which is also the guard that catches
 * somebody "fixing" a missing splash with `cp assets/icon.png
 * assets/splash-icon.png`, since an opaque full-bleed square on the launch
 * field reads as a broken placeholder.
 */
const encodePng = (pixels, size, opaque) => {
  const channels = opaque ? 3 : 4;
  const stride = size * channels;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1) + 1;
    if (opaque) {
      for (let x = 0; x < size; x += 1) {
        const src = (y * size + x) * 4;
        raw[rowStart + x * 3] = pixels[src];
        raw[rowStart + x * 3 + 1] = pixels[src + 1];
        raw[rowStart + x * 3 + 2] = pixels[src + 2];
      }
    } else {
      pixels.copy(raw, rowStart, y * size * 4, (y + 1) * size * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(opaque ? 2 : 6, 9); // 2 = RGB, 6 = RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

// ---------------------------------------------------------------------------
// The SVG, from the same numbers
// ---------------------------------------------------------------------------
/**
 * A colour is either an RGB triple or the literal string `currentColor`, which
 * only the in-app SVG uses: react-native-svg resolves it from the `color` prop,
 * so one asset works on a cream surface and on an ink one. The PNGs never see
 * it — a rasteriser has no cascade to inherit from.
 */
const hex = (colour) =>
  typeof colour === 'string'
    ? colour
    : `#${colour.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

const n = (value) => Number(value.toFixed(3)).toString();

/**
 * `tight` crops the viewBox to the artwork instead of the icon canvas.
 *
 * The icon canvas carries deliberate padding — the mark fills ~48% × 59% of it,
 * which is right for something the OS masks and wrong for something a component
 * sizes. An in-app `<CardiMark width={34} />` on the padded box draws a mark
 * about half the size of the Material glyph it replaced, which is exactly what
 * happened at both call sites. The launch surface had been compensated for the
 * same effect by hand (`SPLASH_LOGO_WIDTH` 200 → 260); a tight box removes the
 * need to compensate at all.
 *
 * The padded box is NOT merely legacy: `cardi-mark.svg` must stay pixel-identical
 * to `splash-icon.png` at the same width, because that identity is what conceals
 * the native→JS splash handoff. So both boxes exist, on purpose.
 */
const buildSvg = ({ size, scale, field, stem, accent, tight = false }) => {
  const { bars, beam, pivot } = shapes(scale);
  const w = tight ? B.x1 - B.x0 : CANVAS;
  const h = tight ? B.y1 - B.y0 : CANVAS;
  const k = size / Math.max(w, h);
  const ox = tight ? B.x0 : originX;
  const oy = tight ? B.y0 : originY;
  const vw = w * k;
  const vh = h * k;
  const map = (rect) => ({
    x: (rect.x - ox) * k,
    y: (rect.y - oy) * k,
    w: rect.w * k,
    h: rect.h * k,
    r: rect.r * k
  });
  const rect = (r_, colour) =>
    `  <rect x="${n(r_.x)}" y="${n(r_.y)}" width="${n(r_.w)}" height="${n(r_.h)}" ` +
    `rx="${n(r_.r)}" fill="${hex(colour)}" />`;
  const p = { x: (pivot.x - ox) * k, y: (pivot.y - oy) * k };
  const beamRect = map(beam);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(vw)} ${n(vh)}" ` +
      `width="${n(vw)}" height="${n(vh)}" role="img" aria-label="Cardì">`,
    field ? `  <rect width="${n(vw)}" height="${n(vh)}" fill="${hex(field)}" />` : null,
    ...bars.map((bar) => rect(map(bar), stem)),
    `  <g transform="rotate(${ANGLE} ${n(p.x)} ${n(p.y)})">`,
    `  ${rect(beamRect, accent)}`,
    '  </g>',
    '</svg>',
    ''
  ]
    .filter((line) => line !== null)
    .join('\n');
};

// ---------------------------------------------------------------------------
// The assets
// ---------------------------------------------------------------------------
const FULL = { scale: 1, stem: WHITE, accent: BEAM_YELLOW };
const ANDROID = { scale: ANDROID_SCALE, stem: WHITE, accent: BEAM_YELLOW };

const PNGS = [
  ['assets/icon.png', { size: 1024, field: INK, ...FULL }],
  ['assets/adaptive-icon.png', { size: 1024, field: null, ...ANDROID }],
  [
    'assets/adaptive-icon-monochrome.png',
    // One colour, no hue to lean on: the beam has to survive as a SHAPE. It does,
    // because it crosses the bars and extends past them on both sides.
    { size: 1024, field: null, scale: ANDROID_SCALE, stem: WHITE, accent: WHITE }
  ],
  ['assets/favicon.png', { size: 48, field: INK, ...FULL }],
  ['assets/splash-icon.png', { size: 1024, field: null, ...FULL }]
];

const SVGS = [
  ['assets/images/cardi-mark.svg', { size: 1024, field: null, ...FULL }],
  ['assets/images/cardi-icon.svg', { size: 1024, field: INK, ...FULL }],
  [
    // The in-app mark: tight box, WHITE stem, on whatever ink field the component
    // paints behind it.
    //
    // This replaced a `currentColor` variant whose stem followed the theme. That
    // idea does not survive contact with the palette: the beam is only legible on
    // ink. Measured — beam on ink 11.53:1, on white 1.52:1, on cream 1.33:1. A
    // theme-following stem therefore buys nothing, because the accent that makes
    // the mark "Cardì" disappears on every light ground regardless of what the
    // stem does. The design system already says this: beam is a FILL that carries
    // dark text, never a stroke on a light surface.
    'assets/images/cardi-mark-inline.svg',
    { size: 1024, field: null, scale: 1, stem: WHITE, accent: BEAM_YELLOW, tight: true }
  ]
];

const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');

const artefacts = [
  ...SVGS.map(([path, opts]) => [path, Buffer.from(buildSvg(opts), 'utf8')]),
  // `field` decides the colour type: an opaque field means an opaque PNG.
  ...PNGS.map(([path, opts]) => [path, encodePng(render(opts), opts.size, opts.field !== null)])
];

const check = process.argv.includes('--check');
let failed = 0;

for (const [relative, buffer] of artefacts) {
  const target = join(ROOT, relative);
  if (check) {
    let current = null;
    try {
      current = readFileSync(target);
    } catch {
      console.error(`✗ ${relative} is missing — run \`yarn icons:build\``);
      failed += 1;
      continue;
    }
    if (sha(current) !== sha(buffer)) {
      console.error(`✗ ${relative} is out of sync with the mark — run \`yarn icons:build\``);
      failed += 1;
    }
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer);
    console.log(`✓ ${relative} (${buffer.length} bytes)`);
  }
}

if (check) {
  if (failed) process.exit(1);
  console.log(`✓ all ${artefacts.length} brand assets are in sync with the mark`);
} else {
  console.log(
    `\nmark bounding radius ${B.radius.toFixed(2)} of ${CANVAS} units · ` +
      `Android foreground scale ×${ANDROID_SCALE.toFixed(3)}`
  );
}
