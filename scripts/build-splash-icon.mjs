#!/usr/bin/env node
/**
 * Rasterise `assets/images/app-icon-variant-aurora-transparent.svg` into
 * `assets/splash-icon.png` — the launch mark (Story 16.17, revised).
 *
 * WHY A RASTERISER LIVES HERE
 *
 * The launch field is the brand blue, and the mark on it is the wallet FOREGROUND
 * — the app icon's artwork minus its own rounded blue container. Two earlier
 * attempts failed on device and are worth recording so nobody repeats them:
 *
 *  1. Reusing `assets/icon.png` directly. It is deliberately opaque and full-bleed,
 *     because iOS and Android apply the squircle mask themselves at the ICON
 *     layer. A splash image gets no such treatment, so the launch field showed a
 *     hard-edged blue SQUARE that read as a broken placeholder.
 *  2. Masking that icon to a rounded rect. Correct-looking, but still an icon-in-a-
 *     box floating on a page, and it left the deeper problem untouched: the field
 *     was theme-aware while the NATIVE splash background is baked at build time
 *     from `userInterfaceStyle: automatic`. It can never read a runtime preference,
 *     so a user who forces dark on a light system got a measured white→black
 *     inversion, ~1.75 s of white then black content, every cold start.
 *
 * A brand-coloured field is the only scheme-INDEPENDENT option that isn't white or
 * black, so it removes the mismatch by construction rather than mitigating it. On
 * that field the mark must drop its container, hence the transparent variant, hence
 * needing to rasterise an SVG.
 *
 * Dependency-free on purpose: this repo has no image library and no rasteriser
 * (`sharp`, `rsvg-convert`, ImageMagick and pyobjc are all absent, and Chrome is not
 * installed for Playwright). Rather than add one, this draws the seven primitives
 * that one file actually uses via signed distance fields, taking antialiasing
 * analytically from the distance instead of supersampling — cheaper AND cleaner.
 *
 * It is NOT a general SVG renderer. If the artwork gains a primitive this does not
 * know about, this script must be updated; it will not silently approximate.
 *
 * Run: `yarn splash:build`   Verify: `yarn splash:check` (pre-push + CI)
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_SVG = join(ROOT, 'assets/images/app-icon-variant-aurora-transparent.svg');
const TARGET = join(ROOT, 'assets/splash-icon.png');

/** The SVG's `viewBox` is `0 0 1024 1024`; render 1:1 so no scaling is implied. */
const SIZE = 1024;

/**
 * Geometry mirrored from the SVG. Kept as data so a drift check can compare it
 * against the file rather than trusting this transcription — see `assertSvgMatches`.
 */
const CARD = { x: 244, y: 304, w: 536, h: 396, r: 96 };
const CARD_STROKE = { color: [0xc7, 0xdb, 0xff], width: 10 };
const PILL = { x: 296, y: 246, w: 432, h: 108, r: 46, color: [0xd9, 0xe9, 0xff], alpha: 1 };
const LINES = [
  { x: 320, y: 420, w: 392, h: 30, r: 15, color: [0xb4, 0xcb, 0xf7], alpha: 0.7 },
  { x: 320, y: 474, w: 306, h: 30, r: 15, color: [0xb4, 0xcb, 0xf7], alpha: 0.55 }
];
const DOTS = [
  { cx: 690, cy: 564, r: 34, color: [0xff, 0xd5, 0x4f], alpha: 1 },
  { cx: 754, cy: 328, r: 18, color: [0xe5, 0x39, 0x35], alpha: 0.88 }
];
/** `feDropShadow dx=0 dy=24 stdDeviation=18 flood-color=#082A67 flood-opacity=0.30`. */
const SHADOW = { dy: 24, stdDeviation: 18, color: [0x08, 0x2a, 0x67], alpha: 0.3 };
/** `linearGradient #wallet`: (250,310) → (780,760), `#FFFFFF` → `#EAF2FF`. */
const WALLET_GRADIENT = {
  x1: 250,
  y1: 310,
  x2: 780,
  y2: 760,
  from: [255, 255, 255],
  to: [234, 242, 255]
};

const hex = ([r, g, b]) =>
  `#${[r, g, b]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

/** `rx`/`x`/`width`… fragment for a rounded rect, in the SVG's own attribute order. */
const rectFragment = ({ x, y, w, h, r }) =>
  `x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;

/**
 * Fail loudly if the SVG no longer matches the geometry transcribed above. This is a
 * hand-written renderer for one specific file; silently rendering stale artwork would
 * be worse than not rendering at all.
 *
 * The fragment list is DERIVED from the same constants the renderer draws from, not
 * hand-maintained alongside them. That distinction is the point: an earlier version
 * listed five fragments by hand and consequently ignored the two line rects, the two
 * accent dots and the gradient stops — a code review proved it by recolouring a dot in
 * the SVG and watching `--check` stay green with a now-stale PNG. Deriving the list
 * means every value the renderer hardcodes is necessarily also a value it verifies,
 * and adding a primitive to the data above extends this guard for free.
 */
const assertSvgMatches = () => {
  const svg = readFileSync(SOURCE_SVG, 'utf8');

  /** `fill-opacity` is only written out when it is not 1. */
  const opacityFragments = ({ alpha }) =>
    alpha === 1 ? [] : [`fill-opacity="${alpha.toFixed(2)}"`];

  const required = [
    'viewBox="0 0 1024 1024"',
    // Wallet card: geometry, gradient fill, centred stroke.
    rectFragment(CARD),
    `stroke="${hex(CARD_STROKE.color)}" stroke-width="${CARD_STROKE.width}"`,
    `x1="${WALLET_GRADIENT.x1}" y1="${WALLET_GRADIENT.y1}" x2="${WALLET_GRADIENT.x2}" y2="${WALLET_GRADIENT.y2}"`,
    `stop-color="${hex(WALLET_GRADIENT.from)}"`,
    `stop-color="${hex(WALLET_GRADIENT.to)}"`,
    // The card-behind pill.
    rectFragment(PILL),
    `fill="${hex(PILL.color)}"`,
    // Both text lines, and both accent dots — the gap the code review found.
    ...LINES.flatMap((line) => [
      rectFragment(line),
      `fill="${hex(line.color)}"`,
      ...opacityFragments(line)
    ]),
    ...DOTS.flatMap((dot) => [
      `cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}"`,
      `fill="${hex(dot.color)}"`,
      ...opacityFragments(dot)
    ]),
    // Drop shadow.
    `stdDeviation="${SHADOW.stdDeviation}"`,
    `dy="${SHADOW.dy}"`,
    `flood-color="${hex(SHADOW.color)}"`,
    `flood-opacity="${SHADOW.alpha.toFixed(2)}"`
  ];

  const missing = required.filter((fragment) => !svg.includes(fragment));
  if (missing.length > 0) {
    throw new Error(
      `${SOURCE_SVG} no longer matches this renderer's transcribed geometry.\n` +
        `Missing: ${missing.join(' | ')}\n` +
        'Update scripts/build-splash-icon.mjs to match the artwork.'
    );
  }
};

/** Signed distance to a rounded rect; negative inside. */
const roundedRectSdf = (px, py, { x, y, w, h, r }) => {
  const dx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const dy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  if (dx <= 0 && dy <= 0) return Math.max(dx, dy) - r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - r;
};

/** Coverage in 0..1 from a signed distance — one-pixel-wide analytic AA. */
const coverage = (distance) => Math.min(1, Math.max(0, 0.5 - distance));

const walletGradientAt = (px, py) => {
  const { x1, y1, x2, y2, from, to } = WALLET_GRADIENT;
  const vx = x2 - x1;
  const vy = y2 - y1;
  const t = Math.min(1, Math.max(0, ((px - x1) * vx + (py - y1) * vy) / (vx * vx + vy * vy)));
  return [0, 1, 2].map((i) => from[i] + (to[i] - from[i]) * t);
};

/** Three box blurs approximate a Gaussian; radius chosen for the given sigma. */
const blurAlpha = (source, size, sigma) => {
  const radius = Math.max(1, Math.round((sigma * 3 * Math.sqrt(2 * Math.PI)) / 4 / 2));
  let buffer = source;
  const prefix = new Float64Array(size + 1);
  for (let pass = 0; pass < 3; pass += 1) {
    const next = new Float64Array(size * size);
    for (let y = 0; y < size; y += 1) {
      prefix[0] = 0;
      for (let x = 0; x < size; x += 1) prefix[x + 1] = prefix[x] + buffer[y * size + x];
      for (let x = 0; x < size; x += 1) {
        const a = Math.max(0, x - radius);
        const b = Math.min(size, x + radius + 1);
        next[y * size + x] = (prefix[b] - prefix[a]) / (b - a);
      }
    }
    const next2 = new Float64Array(size * size);
    for (let x = 0; x < size; x += 1) {
      prefix[0] = 0;
      for (let y = 0; y < size; y += 1) prefix[y + 1] = prefix[y] + next[y * size + x];
      for (let y = 0; y < size; y += 1) {
        const a = Math.max(0, y - radius);
        const b = Math.min(size, y + radius + 1);
        next2[y * size + x] = (prefix[b] - prefix[a]) / (b - a);
      }
    }
    buffer = next2;
  }
  return buffer;
};

const render = () => {
  assertSvgMatches();

  // Shadow: the SVG applies the filter to a <g> holding only the card, so blur the
  // card's alpha alone, offset by dy.
  const cardAlpha = new Float64Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const d = roundedRectSdf(x + 0.5, y + 0.5 - SHADOW.dy, CARD);
      cardAlpha[y * SIZE + x] = coverage(d - CARD_STROKE.width / 2);
    }
  }
  const shadow = blurAlpha(cardAlpha, SIZE, SHADOW.stdDeviation);

  const px = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    const sy = y + 0.5;
    for (let x = 0; x < SIZE; x += 1) {
      const sx = x + 0.5;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      const over = (colour, alpha) => {
        if (alpha <= 0) return;
        const na = alpha + a * (1 - alpha);
        if (na <= 0) return;
        r = (colour[0] * alpha + r * a * (1 - alpha)) / na;
        g = (colour[1] * alpha + g * a * (1 - alpha)) / na;
        b = (colour[2] * alpha + b * a * (1 - alpha)) / na;
        a = na;
      };

      // Shadow sits under everything.
      over(SHADOW.color, shadow[y * SIZE + x] * SHADOW.alpha);

      // Card: stroke is centred on the path, so it extends half a width outside.
      const cardD = roundedRectSdf(sx, sy, CARD);
      over(walletGradientAt(sx, sy), coverage(cardD));
      over(CARD_STROKE.color, coverage(Math.abs(cardD) - CARD_STROKE.width / 2));

      // Painted after the card in the SVG, so it composites on top.
      over(PILL.color, coverage(roundedRectSdf(sx, sy, PILL)) * PILL.alpha);
      for (const line of LINES)
        over(line.color, coverage(roundedRectSdf(sx, sy, line)) * line.alpha);
      for (const dot of DOTS) {
        over(dot.color, coverage(Math.hypot(sx - dot.cx, sy - dot.cy) - dot.r) * dot.alpha);
      }

      const o = (y * SIZE + x) * 4;
      px[o] = Math.round(Math.min(255, Math.max(0, r)));
      px[o + 1] = Math.round(Math.min(255, Math.max(0, g)));
      px[o + 2] = Math.round(Math.min(255, Math.max(0, b)));
      px[o + 3] = Math.round(Math.min(255, Math.max(0, a * 255)));
    }
  }
  return px;
};

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

const encodePng = (px) => {
  const stride = SIZE * 4;
  const raw = Buffer.alloc(SIZE * (stride + 1));
  for (let y = 0; y < SIZE; y += 1) {
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

const png = encodePng(render());
const sha = (buffer) => createHash('sha256').update(buffer).digest('hex');

if (process.argv.includes('--check')) {
  if (sha(readFileSync(TARGET)) !== sha(png)) {
    console.error(
      '✗ assets/splash-icon.png is out of sync with app-icon-variant-aurora-transparent.svg — run `yarn splash:build`'
    );
    process.exit(1);
  }
  console.log('✓ assets/splash-icon.png is in sync with the aurora foreground artwork');
} else {
  writeFileSync(TARGET, png);
  console.log(`✓ wrote assets/splash-icon.png (${SIZE}x${SIZE} RGBA, ${png.length} bytes)`);
}
