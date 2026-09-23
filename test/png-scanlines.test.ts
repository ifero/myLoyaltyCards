import { deflateSync } from 'node:zlib';

import { COLOR_TYPE_RGB, COLOR_TYPE_RGBA, decodeScanlines, readHeader } from './png-scanlines';

/**
 * The shared PNG reader behind `watch-icons.test.ts` and `wear-icons.test.ts`.
 *
 * Both of those exercise it heavily and indirectly — but only down the happy path, on files the
 * generator wrote. The branch this module exists for is the one they can never reach: the
 * `filter !== 0` throw, which is the guard against `build-brand-icons.mjs` quietly gaining
 * adaptive scanline filtering and changing what both suites measure without either failing.
 * Nothing in the repository is a non-zero-filter PNG, so that throw can only be proven by
 * building one here.
 *
 * The fixtures are assembled byte by byte rather than read from disk, deliberately: a fixture
 * file could drift, and a hand-built IHDR is the only way to assert that `readHeader` reads the
 * fields it claims to rather than ones that happen to agree on our own assets.
 */

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer: Buffer): number => {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1)
    c = (crcTable[(c ^ (buffer[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
};

/**
 * Build a PNG, square unless `height` says otherwise.
 *
 * @param filters one filter byte per scanline, so a test can put a bad one on a chosen row
 *   rather than only on the first — the error names the row, and an off-by-one there would be
 *   invisible if every fixture failed on row 0.
 * @param idatParts split the compressed stream across this many IDAT chunks. Real screenshots
 *   are chunked; the generator writes one. Both must decode.
 * @param height defaults to `width`. Every icon is square; the store banners (Story 21.5) are
 *   1024 x 500 and 4096 x 2304, and a decoder that assumed square would read them skewed rather
 *   than fail — which is the case the non-square fixture below exists to rule out.
 */
const buildPng = (
  width: number,
  channels: number,
  pixelRows: number[][],
  filters: number[],
  idatParts = 1,
  height = width
): Buffer => {
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = filters[y] ?? 0;
    Buffer.from(pixelRows[y] ?? []).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(channels === 4 ? COLOR_TYPE_RGBA : COLOR_TYPE_RGB, 9);
  const compressed = deflateSync(raw, { level: 9 });
  const per = Math.ceil(compressed.length / idatParts);
  const idats: Buffer[] = [];
  for (let i = 0; i < compressed.length; i += per) {
    idats.push(chunk('IDAT', compressed.subarray(i, i + per)));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...idats,
    chunk('IEND', Buffer.alloc(0))
  ]);
};

/** A 2x2 RGB image whose four pixels are all distinguishable. */
const RGB_ROWS = [
  [1, 2, 3, 4, 5, 6],
  [7, 8, 9, 10, 11, 12]
];

describe('png-scanlines', () => {
  describe('readHeader', () => {
    it('reads the IHDR fields it claims to, from a hand-built header', () => {
      const png = buildPng(2, 3, RGB_ROWS, [0, 0]);
      expect(readHeader(png)).toEqual({
        width: 2,
        height: 2,
        depth: 8,
        colorType: COLOR_TYPE_RGB
      });
    });

    it('distinguishes the two colour types the generator emits', () => {
      const rgba = buildPng(1, 4, [[9, 8, 7, 6]], [0]);
      expect(readHeader(rgba).colorType).toBe(COLOR_TYPE_RGBA);
      expect(readHeader(buildPng(1, 3, [[9, 8, 7]], [0])).colorType).toBe(COLOR_TYPE_RGB);
    });
  });

  describe('decodeScanlines', () => {
    it('strips the filter byte and leaves pixels indexable by (y * width + x) * channels', () => {
      // The contract the icon suites index against. If the filter byte were left in, every
      // pixel after the first would be off by one channel and every colour assertion downstream
      // would be reading its neighbour.
      const { width, height, channels, pixels } = decodeScanlines(
        buildPng(2, 3, RGB_ROWS, [0, 0]),
        'fixture'
      );
      expect({ width, height, channels }).toEqual({ width: 2, height: 2, channels: 3 });
      expect([...pixels]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('reads a NON-SQUARE image without skewing it', () => {
      // The store banners are 1024 x 500 and 4096 x 2304. A decoder that took one dimension for
      // both would still return plausible bytes — just shifted a row at a time — so this fixture
      // is 3 wide and 2 tall, where transposing gives a different answer rather than a shorter
      // one, and the last pixel of each row is distinguishable from the first of the next.
      const { width, height, pixels } = decodeScanlines(
        buildPng(
          3,
          3,
          [
            [1, 1, 1, 2, 2, 2, 3, 3, 3],
            [4, 4, 4, 5, 5, 5, 6, 6, 6]
          ],
          [0, 0],
          1,
          2
        ),
        'fixture'
      );
      expect({ width, height }).toEqual({ width: 3, height: 2 });
      expect([...pixels]).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6]);
      // Pixel (0, 1) is the start of the second row, which only a width-aware stride finds.
      expect(pixels[(1 * width + 0) * 3]).toBe(4);
    });

    it('reports 4 channels for an RGBA source and keeps the alpha byte', () => {
      const { channels, pixels } = decodeScanlines(
        buildPng(1, 4, [[10, 20, 30, 40]], [0]),
        'fixture'
      );
      expect(channels).toBe(4);
      expect([...pixels]).toEqual([10, 20, 30, 40]);
    });

    it('joins a stream split across several IDAT chunks', () => {
      // The generator writes one IDAT; a screenshot or any other encoder may write many, and the
      // difference is invisible until a decode silently returns a truncated image.
      const { pixels } = decodeScanlines(buildPng(2, 3, RGB_ROWS, [0, 0], 4), 'fixture');
      expect([...pixels]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('THROWS on a non-zero filter byte, naming the file and the row', () => {
      // The whole reason this module refuses to be a general PNG decoder. `build-brand-icons.mjs`
      // never sets a filter byte, so anything else means the encoder changed underneath the icon
      // suites — which would otherwise keep passing while measuring reconstructed nonsense.
      // Row 1, not row 0, so an off-by-one in the reported index cannot hide.
      const png = buildPng(2, 3, RGB_ROWS, [0, 2]);
      expect(() => decodeScanlines(png, 'assets/example.png')).toThrow(
        'assets/example.png: scanline 1 uses PNG filter 2, expected 0 (None)'
      );
    });

    it.each([1, 2, 3, 4])('rejects filter type %i rather than reconstructing it', (filter) => {
      expect(() => decodeScanlines(buildPng(1, 3, [[1, 2, 3]], [filter]), 'f.png')).toThrow(
        /uses PNG filter/
      );
    });
  });
});
