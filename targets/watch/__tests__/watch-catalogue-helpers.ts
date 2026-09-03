// Shared helpers for the watch catalogue suites. Not a `*.test.ts` file, so Jest
// treats it as a module rather than a suite.
//
// Both `generate-catalogue.test.ts` (which runs the generator) and
// `watch-brand-logo-contract.test.ts` (which inspects the committed tree) need to
// enumerate brand-logo imagesets and read the brand-id sets back out of generated
// Swift, so the two live here rather than being copied into each file.

import fs from 'node:fs';
import { deflateSync } from 'node:zlib';

/**
 * Real content of an imageset directory, sorted — dotfiles excluded, matching the
 * generator's own `isImagesetContent`. Comparing raw `readdirSync` output would fail
 * for a stray `.DS_Store` in one tracked catalogue and not the other: noise, not a
 * regression.
 */
export const imagesetMembers = (imagesetDir: string): string[] =>
  fs
    .readdirSync(imagesetDir)
    .filter((name) => !name.startsWith('.'))
    .sort();

/** `BrandLogo-*.imageset` folder names in `directory`, sorted. */
export const brandLogoImagesets = (directory: string): string[] =>
  fs
    .readdirSync(directory)
    .filter((name) => /^BrandLogo-.+\.imageset$/.test(name))
    .sort();

/**
 * Extracts the sorted brand-id slugs from a `static let <name>: Set<String> = [ … ]`
 * literal in a generated catalog. `sourceLabel` names what was searched so a failure
 * says where to look.
 */
export const parseSwiftStringSet = (
  source: string,
  name: string,
  sourceLabel = 'the generated catalog'
): string[] => {
  const match = source.match(new RegExp(`static let ${name}: Set<String> = \\[([\\s\\S]*?)\\]`));
  const body = match?.[1];
  if (body === undefined) {
    throw new Error(`Could not find "${name}" set in ${sourceLabel}`);
  }
  return [...body.matchAll(/"([^"]+)"/g)]
    .map((entry) => entry[1])
    .filter((value): value is string => value !== undefined)
    .sort();
};

/**
 * Writes a minimal opaque single-colour PNG. Used to build artwork that rasterizes
 * to a uniform rectangle — structurally a valid PNG with no mark in it, which is
 * what the generator's blank-artwork detection looks for.
 */
export const writeUniformPNG = (filePath: string, size = 8, grey = 255): void => {
  const chunk = (type: string, body: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const typeAndBody = Buffer.concat([Buffer.from(type, 'ascii'), body]);
    const crcTable: number[] = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const byte of typeAndBody) crc = (crcTable[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, typeAndBody, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10-12 default to 0: deflate, adaptive filtering, no interlace.

  const row = Buffer.concat([
    Buffer.from([0]), // filter type: none
    Buffer.concat(Array.from({ length: size }, () => Buffer.from([grey, grey, grey, 255])))
  ]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));

  fs.writeFileSync(
    filePath,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0))
    ])
  );
};
