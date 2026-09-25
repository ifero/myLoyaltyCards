import { inflateSync } from 'node:zlib';

/**
 * Unpack one of OUR PNGs to flat pixel bytes.
 *
 * Shared by `watch-icons.test.ts`, `wear-icons.test.ts` and `store-artwork.test.ts`, which ask
 * different questions of the same encoder: the watchOS artefacts are opaque, so that suite reads
 * RGB and asks "which pixels are not the ink field"; the Wear OS layers are transparent marks on
 * a field the system paints, so that suite reads RGBA and asks "which pixels have any alpha at
 * all"; the store banners are neither square nor an icon, and that suite asks whether the
 * committed raster still matches the SVG it was generated from. Those views are genuinely
 * different and each suite still builds its own. **Everything below the view is not** — walking
 * IDAT chunks, inflating, and stripping the per-scanline filter byte is the same work whatever
 * you then do with the bytes, so it lives here once.
 *
 * ⚠️ **This is not a general PNG decoder** and must not become one. It reconstructs no filters,
 * because `scripts/build-brand-icons.mjs` allocates a zeroed buffer and never sets a filter
 * byte, so every scanline is type 0 (None). Asserting that rather than handling the other four
 * is deliberate: an encoder change that introduced adaptive filtering fails here loudly instead
 * of silently changing what both suites measure. Anything else — a prebuild-written PNG, an
 * asset from a designer — will throw, which is the correct outcome rather than a limitation.
 */

/** PNG colour type 2 — RGB, no alpha channel. */
export const COLOR_TYPE_RGB = 2;
/** PNG colour type 6 — RGBA. */
export const COLOR_TYPE_RGBA = 6;

export type Decoded = {
  /**
   * Pixel dimensions. The icons are all square and read `width` twice; the store banners
   * (Story 21.5) are 1024 x 500 and 4096 x 2304, which is why these are two fields.
   */
  width: number;
  height: number;
  /** 3 for {@link COLOR_TYPE_RGB}, 4 for {@link COLOR_TYPE_RGBA}. */
  channels: number;
  /** `width × height × channels` bytes, filter bytes removed: pixel (x, y) starts at `(y * width + x) * channels`. */
  pixels: Buffer;
};

/** The IHDR fields both suites read, without unpacking the whole image. */
export type Header = { width: number; height: number; depth: number; colorType: number };

export const readHeader = (png: Buffer): Header => ({
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
  depth: png.readUInt8(24),
  colorType: png.readUInt8(25)
});

/**
 * @param label identifies the file in the filter-type error, which is the only way a caller
 *   learns *which* artefact broke the encoder's invariant.
 */
export const decodeScanlines = (png: Buffer, label: string): Decoded => {
  const { width, height, colorType } = readHeader(png);
  const channels = colorType === COLOR_TYPE_RGBA ? 4 : 3;
  const parts: Buffer[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      parts.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    if (filter !== 0) {
      throw new Error(`${label}: scanline ${y} uses PNG filter ${filter}, expected 0 (None)`);
    }
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
  }
  return { width, height, channels, pixels };
};
