import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');
const generatorPath = path.join(repoRoot, 'targets', 'watch', 'BarcodeGenerator.swift');
const cardSchemaPath = path.join(repoRoot, 'core', 'schemas', 'card.ts');

/**
 * Story 16.28 — the CI-enforceable half of the barcode-symbology guarantee.
 *
 * The Swift XCTests in `watch-ios/Tests/` are not wired into any build target, so
 * nothing runs them automatically. These assertions inspect the Swift source
 * instead, which CI does run (`.github/workflows/watchos-tests.yml`).
 *
 * REFERENCE TABLES below were generated from BWIPP (Barcode Writer in Pure
 * PostScript) via bwip-js 4.10.1 (2026-04-22) / BWIPP 2026-04-21 — the same library and
 * the same `bcid`s the phone renders these cards with (`BarcodeRenderer.tsx`).
 * Matching them means a card drawn on the wrist is the same symbol as on the
 * phone. They are published reference data, not this encoder's own output.
 *
 * The extraction was validated against `encodeEAN13`, which already shipped and
 * is known good: BWIPP's module array for 5901234123457 is byte-identical to it.
 */

/** EAN/UPC left-hand "odd parity" (A) digit patterns. */
const REFERENCE_EAN_LEFT_ODD = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011'
];

/** EAN/UPC right-hand digit patterns — the bitwise complement of the left set. */
const REFERENCE_EAN_RIGHT = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100'
];

/** The Code 39 `*` start/stop delimiter, as nine element widths. */
const REFERENCE_CODE39_DELIMITER = '131131311';

/**
 * Code 128's three start code words and its STOP, as element widths — BWIPP `code128` `encs`
 * entries 103-106, the last four in that 107-entry table.
 *
 * Keyed by index on purpose: the value alone would not prove the STOP sits at 106, and the
 * defect Story 16.37 fixed was an entry in the right shape at the right index with the wrong
 * content, surrounded by three unreachable duplicates that hid it.
 */
const REFERENCE_CODE128_DELIMITERS: Record<number, string> = {
  103: '211412', // Start A
  104: '211214', // Start B
  105: '211232', // Start C
  106: '2331112' // STOP — seven elements, 13 modules
};

/** All 43 encodable Code 39 characters, as nine element widths each. */
const REFERENCE_CODE39: Record<string, string> = {
  '0': '111331311',
  '1': '311311113',
  '2': '113311113',
  '3': '313311111',
  '4': '111331113',
  '5': '311331111',
  '6': '113331111',
  '7': '111311313',
  '8': '311311311',
  '9': '113311311',
  A: '311113113',
  B: '113113113',
  C: '313113111',
  D: '111133113',
  E: '311133111',
  F: '113133111',
  G: '111113313',
  H: '311113311',
  I: '113113311',
  J: '111133311',
  K: '311111133',
  L: '113111133',
  M: '313111131',
  N: '111131133',
  O: '311131131',
  P: '113131131',
  Q: '111111333',
  R: '311111331',
  S: '113111331',
  T: '111131331',
  U: '331111113',
  V: '133111113',
  W: '333111111',
  X: '131131113',
  Y: '331131111',
  Z: '133131111',
  '-': '131111313',
  '.': '331111311',
  ' ': '133111311',
  $: '131313111',
  '/': '131311131',
  '+': '131113131',
  '%': '111313131'
};

/** Published minimum quiet zone per symbology, in modules. */
const REFERENCE_QUIET_ZONES: Record<string, number> = {
  // GS1 General Specifications.
  EAN8: 7,
  UPCA: 9,
  // ISO/IEC 16388: ten narrow elements.
  CODE39: 10,
  // Unchanged from what they already shipped with; revisiting them belongs to the
  // geometry story, not 16.28.
  EAN13: 10,
  CODE128: 10,
  QR: 10
};

/**
 * Full BWIPP reference symbols, same provenance as the tables above. These drive the
 * one assertion that actually EXECUTES the shipped Swift, rather than inspecting it.
 */
const REFERENCE_SYMBOLS: ReadonlyArray<{ format: string; value: string; modules: string }> = [
  {
    format: 'EAN8',
    value: '95200002',
    modules: '1,1,1,3,1,1,2,1,2,3,1,2,1,2,2,3,2,1,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,2,1,2,2,1,1,1'
  },
  {
    format: 'EAN8',
    value: '20886509',
    modules: '1,1,1,2,1,2,2,3,2,1,1,1,2,1,3,1,2,1,3,1,1,1,1,1,1,1,1,4,1,2,3,1,3,2,1,1,3,1,1,2,1,1,1'
  },
  {
    format: 'EAN8',
    value: '00000000',
    modules: '1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1'
  },
  {
    format: 'EAN8',
    value: '12345670',
    modules: '1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,1,1,1,1,1,2,3,1,1,1,1,4,1,3,1,2,3,2,1,1,1,1,1'
  },
  {
    format: 'UPCA',
    value: '012345000058',
    modules:
      '1,1,1,3,2,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,2,3,1,1,2,1,3,1,1,1'
  },
  {
    format: 'UPCA',
    value: '036000291452',
    modules:
      '1,1,1,3,2,1,1,1,4,1,1,1,1,1,4,3,2,1,1,3,2,1,1,3,2,1,1,1,1,1,1,1,2,1,2,2,3,1,1,2,2,2,2,1,1,1,3,2,1,2,3,1,2,1,2,2,1,1,1'
  },
  {
    format: 'UPCA',
    value: '123456789012',
    modules:
      '1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,1,1,4,1,1,1,1,1,1,3,1,2,1,2,1,3,3,1,1,2,3,2,1,1,2,2,2,1,2,1,2,2,1,1,1'
  },
  {
    format: 'CODE39',
    value: 'A',
    modules: '1,3,1,1,3,1,3,1,1,1,3,1,1,1,1,3,1,1,3,1,1,3,1,1,3,1,3,1,1'
  },
  {
    format: 'CODE39',
    value: '0',
    modules: '1,3,1,1,3,1,3,1,1,1,1,1,1,3,3,1,3,1,1,1,1,3,1,1,3,1,3,1,1'
  },
  {
    format: 'CODE39',
    value: 'ABC123',
    modules:
      '1,3,1,1,3,1,3,1,1,1,3,1,1,1,1,3,1,1,3,1,1,1,3,1,1,3,1,1,3,1,3,1,3,1,1,3,1,1,1,1,3,1,1,3,1,1,1,1,3,1,1,1,3,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,1,1,1,3,1,1,3,1,3,1,1'
  },
  {
    format: 'CODE39',
    value: '-. $/+%',
    modules:
      '1,3,1,1,3,1,3,1,1,1,1,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,3,1,1,1,1,3,3,1,1,1,3,1,1,1,1,3,1,3,1,3,1,1,1,1,1,3,1,3,1,1,1,3,1,1,1,3,1,1,1,3,1,3,1,1,1,1,1,3,1,3,1,3,1,1,1,3,1,1,3,1,3,1,1'
  },
  {
    format: 'CODE39',
    value: 'HELLO WORLD',
    modules:
      '1,3,1,1,3,1,3,1,1,1,3,1,1,1,1,3,3,1,1,1,3,1,1,1,3,3,1,1,1,1,1,1,3,1,1,1,1,3,3,1,1,1,3,1,1,1,1,3,3,1,3,1,1,1,3,1,1,3,1,1,1,3,3,1,1,1,3,1,1,1,3,3,3,1,1,1,1,1,1,1,3,1,1,1,3,1,1,3,1,1,3,1,1,1,1,1,3,3,1,1,1,1,3,1,1,1,1,3,3,1,1,1,1,1,3,3,1,1,3,1,1,3,1,1,3,1,3,1,1'
  },
  {
    format: 'CODE39',
    value: '1234567890',
    modules:
      '1,3,1,1,3,1,3,1,1,1,3,1,1,3,1,1,1,1,3,1,1,1,3,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,1,1,1,1,1,3,3,1,1,1,3,1,3,1,1,3,3,1,1,1,1,1,1,1,3,3,3,1,1,1,1,1,1,1,1,3,1,1,3,1,3,1,3,1,1,3,1,1,3,1,1,1,1,1,3,3,1,1,3,1,1,1,1,1,1,3,3,1,3,1,1,1,1,3,1,1,3,1,3,1,1'
  },
  // 7 and 11 digits drive the *compute the check digit* branches; the 8- and 12-digit
  // cases above drive the *validate it* branches. BWIPP renders each pair identically.
  {
    format: 'EAN8',
    value: '9520000',
    modules: '1,1,1,3,1,1,2,1,2,3,1,2,1,2,2,3,2,1,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,2,1,2,2,1,1,1'
  },
  {
    format: 'UPCA',
    value: '01234500005',
    modules:
      '1,1,1,3,2,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,1,1,1,1,3,2,1,1,3,2,1,1,3,2,1,1,3,2,1,1,1,2,3,1,1,2,1,3,1,1,1'
  },
  // Every one of the 43 encodable Code 39 characters, so no table entry is checked
  // only statically.
  {
    format: 'CODE39',
    value: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%',
    modules:
      '1,3,1,1,3,1,3,1,1,1,1,1,1,3,3,1,3,1,1,1,3,1,1,3,1,1,1,1,3,1,1,1,3,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,1,1,1,1,1,3,3,1,1,1,3,1,3,1,1,3,3,1,1,1,1,1,1,1,3,3,3,1,1,1,1,1,1,1,1,3,1,1,3,1,3,1,3,1,1,3,1,1,3,1,1,1,1,1,3,3,1,1,3,1,1,1,3,1,1,1,1,3,1,1,3,1,1,1,3,1,1,3,1,1,3,1,3,1,3,1,1,3,1,1,1,1,1,1,1,1,3,3,1,1,3,1,3,1,1,1,3,3,1,1,1,1,1,1,3,1,3,3,1,1,1,1,1,1,1,1,1,3,3,1,3,1,3,1,1,1,1,3,3,1,1,1,1,1,3,1,1,3,3,1,1,1,1,1,1,1,3,3,3,1,1,1,3,1,1,1,1,1,1,3,3,1,1,1,3,1,1,1,1,3,3,1,3,1,3,1,1,1,1,3,1,1,1,1,1,1,3,1,1,3,3,1,3,1,1,1,3,1,1,3,1,1,1,1,3,1,3,1,1,3,1,1,1,1,1,1,1,1,3,3,3,1,3,1,1,1,1,1,3,3,1,1,1,1,3,1,1,1,3,3,1,1,1,1,1,1,3,1,3,3,1,1,3,3,1,1,1,1,1,1,3,1,1,3,3,1,1,1,1,1,3,1,3,3,3,1,1,1,1,1,1,1,1,3,1,1,3,1,1,1,3,1,3,3,1,1,3,1,1,1,1,1,1,3,3,1,3,1,1,1,1,1,1,3,1,1,1,1,3,1,3,1,3,3,1,1,1,1,3,1,1,1,1,3,3,1,1,1,3,1,1,1,1,3,1,3,1,3,1,1,1,1,1,3,1,3,1,1,1,3,1,1,1,3,1,1,1,3,1,3,1,1,1,1,1,3,1,3,1,3,1,1,1,3,1,1,3,1,3,1,1'
  },
  // EAN-13 was already correct; it is here so the executed harness proves Story 16.34's
  // digit-parsing change altered no output.
  {
    format: 'EAN13',
    value: '5901234123457',
    modules:
      '1,1,1,3,1,1,2,1,1,2,3,1,2,2,2,2,1,2,2,1,4,1,1,2,3,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,3,1,2,1,1,1'
  },
  // 12 digits drives the *compute the check digit* branch, as the EAN-8 and UPC-A rows
  // above do for theirs. BWIPP renders it identically to the 13-digit form.
  //
  // The value is chosen to DISCRIMINATE, not merely to be valid: `encodeEAN13` weights its
  // 12 data digits 1,3,1,… while `upcEANCheckDigit` weights odd-length data 3,1,3,…, and
  // the two agree whenever (sum of even-index digits − sum of odd-index digits) % 5 == 0.
  // `590123412345` is such a coincidence — both helpers yield check digit 7 — so it cannot
  // detect the two being swapped. For `590123412341` they yield 9 and 1, so it can.
  {
    format: 'EAN13',
    value: '590123412341',
    modules:
      '1,1,1,3,1,1,2,1,1,2,3,1,2,2,2,2,1,2,2,1,4,1,1,2,3,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,2,2,2,1,3,1,1,2,1,1,1'
  },
  // Separator tolerance, which `encodeEAN13` has always had and AC2 requires it to keep.
  // BWIPP cannot supply this vector — it rejects the value as "EAN-13 must be 12 or 13
  // digits" — so the expectation is derived: a separator is ignored, therefore the symbol
  // must equal the clean value's BWIPP symbol above.
  {
    format: 'EAN13',
    value: '5901234-123457',
    modules:
      '1,1,1,3,1,1,2,1,1,2,3,1,2,2,2,2,1,2,2,1,4,1,1,2,3,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,4,1,1,1,1,3,2,1,2,3,1,1,3,1,2,1,1,1'
  },
  // ---- Code 128 ----------------------------------------------------------------------
  // Absent until Story 16.37, which is why a truncated STOP pattern — `widthsTable[106]`
  // holding "233111" where Code 128 specifies "2331112" — shipped unnoticed while the three
  // formats 16.28 introduced were covered. Every row below ends `...,3,3,1,1,1,2`; that final
  // 2 is the bar the defect dropped.
  //
  // ⚠️ CHECK a new value before adding it. Code 128's code-set switches are an OPTIMISATION,
  // so several encodings of the same text are valid, and this encoder's heuristics are simpler
  // than BWIPP's. They diverge on `A12345` (9 code words vs BWIPP's 8) and on
  // `CARD 12345 ABC` (same length, different set choices). Both still DECODE correctly — they
  // are less compact, not wrong — so they are deliberately excluded rather than treated as
  // failures. Only values where the two agree exactly belong here.
  // Start C on a >=4 digit run, then the C->B switch (100) for the odd trailing digit.
  {
    format: 'CODE128',
    value: '5901234123457',
    modules:
      '2,1,1,2,3,2,3,3,2,1,1,1,2,2,2,1,2,2,3,1,2,1,3,1,2,3,1,3,1,1,3,1,2,1,3,1,1,1,3,1,2,3,1,1,4,1,3,1,3,1,2,1,3,1,2,2,1,2,3,1,2,3,3,1,1,1,2'
  },
  // All digits, even length: Start C and never leaves it.
  {
    format: 'CODE128',
    value: '12345678',
    modules: '2,1,1,2,3,2,1,1,2,2,3,2,1,3,1,1,2,3,3,3,1,1,2,1,2,4,1,1,1,2,1,3,3,1,2,1,2,3,3,1,1,1,2'
  },
  // One digit — odd, so the all-digits Start C heuristic declines and it starts in B.
  {
    format: 'CODE128',
    value: '7',
    modules: '2,1,1,2,1,4,3,1,2,1,3,1,3,1,1,2,2,2,2,3,3,1,1,1,2'
  },
  // Non-digit first character: Start B, and the trailing 3-digit run is under the 4 that would switch to C.
  {
    format: 'CODE128',
    value: 'ABC-123',
    modules:
      '2,1,1,2,1,4,1,1,1,3,2,3,1,3,1,1,2,3,1,3,1,3,2,1,1,2,2,1,3,2,1,2,3,2,2,1,2,2,3,2,1,1,2,2,1,1,3,2,1,1,2,4,1,2,2,3,3,1,1,1,2'
  },
  // Start B, then the B->C switch (99) once a 4+ digit run appears.
  {
    format: 'CODE128',
    value: 'AB123456',
    modules:
      '2,1,1,2,1,4,1,1,1,3,2,3,1,3,1,1,2,3,1,1,3,1,4,1,1,1,2,2,3,2,1,3,1,1,2,3,3,3,1,1,2,1,3,2,1,2,2,1,2,3,3,1,1,1,2'
  },
  // The full round trip: Start C, drop to B for the letters, return to C.
  {
    format: 'CODE128',
    value: '1234ABCD5678',
    modules:
      '2,1,1,2,3,2,1,1,2,2,3,2,1,3,1,1,2,3,1,1,4,1,3,1,1,1,1,3,2,3,1,3,1,1,2,3,1,3,1,3,2,1,1,1,2,3,1,3,1,1,3,1,4,1,3,3,1,1,2,1,2,4,1,1,1,2,3,2,2,2,1,1,2,3,3,1,1,1,2'
  },
  // Shortest B-with-a-digit form; the 1-digit run must not trigger C.
  {
    format: 'CODE128',
    value: 'A1',
    modules: '2,1,1,2,1,4,1,1,1,3,2,3,1,2,3,2,2,1,1,4,1,2,2,1,2,3,3,1,1,1,2'
  },
  // Code B across lower case, space and punctuation.
  {
    format: 'CODE128',
    value: 'Hello World!',
    modules:
      '2,1,1,2,1,4,2,3,1,1,1,3,1,1,2,2,1,4,2,2,1,1,1,4,2,2,1,1,1,4,1,3,4,1,1,1,2,1,2,2,2,2,3,1,1,3,2,1,1,3,4,1,1,1,1,2,1,2,4,1,2,2,1,1,1,4,1,4,1,2,2,1,2,2,2,1,2,2,3,1,1,3,2,1,2,3,3,1,1,1,2'
  },
  // The ASCII gate boundaries — 32 and 126, the lowest and highest characters it accepts.
  {
    format: 'CODE128',
    value: ' ~',
    modules: '2,1,1,2,1,4,2,1,2,2,2,2,1,3,1,1,4,1,4,1,1,2,1,2,2,3,3,1,1,1,2'
  },
  // A checksum whose data code words are all zero.
  {
    format: 'CODE128',
    value: '0000000000',
    modules:
      '2,1,1,2,3,2,2,1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1,2,3,3,1,1,1,2'
  },
  // Longest pure Code C case here; 16 digits is 8 pairs.
  {
    format: 'CODE128',
    value: '9999999999999999',
    modules:
      '2,1,1,2,3,2,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,3,1,4,1,1,1,1,4,2,2,2,3,3,1,1,1,2'
  },
  // Leading zeros, which pair-encoding must not normalise away.
  {
    format: 'CODE128',
    value: '000012345678',
    modules:
      '2,1,1,2,3,2,2,1,2,2,2,2,2,1,2,2,2,2,1,1,2,2,3,2,1,3,1,1,2,3,3,3,1,1,2,1,2,4,1,1,1,2,4,1,1,3,1,1,2,3,3,1,1,1,2'
  }
];

/** Inputs no encoder may accept — each must come back `nil`, never a substituted symbol. */
const UNENCODABLE: ReadonlyArray<{ format: string; value: string }> = [
  // Bad check digit.
  { format: 'EAN8', value: '95200003' },
  { format: 'UPCA', value: '012345000059' },
  // Wrong length.
  { format: 'EAN8', value: '952000' },
  { format: 'UPCA', value: '0123450000581' },
  // Code 39 has no lower case, and no character outside its 43.
  { format: 'CODE39', value: 'abc' },
  { format: 'CODE39', value: 'ABC!' },
  { format: 'CODE39', value: '' },
  // EAN-13 shares the family's contract: bad checksum and wrong length both refuse.
  { format: 'EAN13', value: '5901234123458' },
  { format: 'EAN13', value: '59012341234' },
  // Non-ASCII numerals: `isWholeNumber` is true, but every reading of them is wrong.
  { format: 'EAN8', value: '\u0663' + '5200002' },
  { format: 'UPCA', value: '\u3248' + '12345000058' },
  // EAN-13 traps on all three before Story 16.34 (exit 133, SIGTRAP): \u0663 parses to
  // nil under `Int(String(_:))`, \u2167 reads as the digit 8 it is not, and \u3248 reads
  // as 10 — past the end of the ten-entry pattern tables.
  { format: 'EAN13', value: '\u0663' + '901234123457' },
  { format: 'EAN13', value: '590123412345' + '\u2167' },
  { format: 'EAN13', value: '\u3248' + '901234123457' },
  // Code 128 accepts ASCII 32..126 and nothing else. That gate is what makes its later
  // `asciiValue!` uses unreachable (checked in Story 16.34), so it has to keep refusing:
  // BWIPP would encode 'CAF\u00c9' through a latin-1 path, and matching that would trade a
  // readable fallback for a symbol the card does not carry.
  { format: 'CODE128', value: 'CAF\u00c9' },
  { format: 'CODE128', value: '\u0663' + '5901234' },
  // Tab is ASCII, but below 32.
  { format: 'CODE128', value: '5901234\t123' }
];

/**
 * Slice a Swift declaration out of `source`, brace/bracket-matched.
 *
 * Anchors on the signature's OWN trailing delimiter: `[String] = [` contains an
 * earlier `[` belonging to the type annotation, not to the array literal.
 */
const swiftDeclaration = (source: string, signature: string) => {
  const start = source.indexOf(signature);

  if (start === -1) {
    throw new Error(`Unable to find "${signature}" in BarcodeGenerator.swift`);
  }

  const open = signature.trimEnd().endsWith('[') ? '[' : '{';
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;

  for (let i = start + signature.length - 1; i < source.length; i += 1) {
    const character = source[i];

    if (character === '"' && source[i - 1] !== '\\') {
      inString = !inString;
    }

    if (inString) {
      continue;
    }

    // Skip comments: a brace or bracket written in prose must not move the depth.
    if (character === '/' && source[i + 1] === '/') {
      const newline = source.indexOf('\n', i);

      if (newline === -1) {
        break;
      }

      i = newline;
      continue;
    }

    if (character === '/' && source[i + 1] === '*') {
      const commentEnd = source.indexOf('*/', i + 2);

      if (commentEnd === -1) {
        break;
      }

      i = commentEnd + 1;
      continue;
    }

    if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error(`Unbalanced delimiters while slicing "${signature}"`);
};

/**
 * Declarations the harness needs; all are pure and free of SwiftUI/UIKit.
 *
 * Deliberately exact signatures, not prefixes: they must anchor unambiguously, and a
 * loose match could latch onto a doc comment instead. Renaming a parameter therefore
 * fails here — loudly, naming the declaration it could not find, which is the right
 * trade for a harness whose whole value is running the real shipped code.
 */
const HARNESS_DECLARATIONS = [
  'private static let eanLeftOddPatterns: [String] = [',
  'private static let eanRightPatterns: [String] = [',
  'private static func asciiDigits(of value: String) -> [Int]? {',
  'private static func upcEANCheckDigit(for digits: [Int]) -> Int {',
  'private static func encodeEAN13(value: String) -> [Int]? {',
  'private static func ean13CheckDigit(for digits: [Int]) -> Int {',
  'private static func encodeEAN8(value: String) -> [Int]? {',
  'private static func encodeUPCA(value: String) -> [Int]? {',
  'private static let code39Patterns: [Character: String] = [',
  'private static func encodeCode39(value: String) -> [Int]? {',
  // Self-contained: its only helper, `digitRunLength`, is nested inside it, and its
  // `widthsTable` is a local `let` — so it needs no companion declaration here.
  'private static func encodeCode128(value: String) -> [Int]? {',
  'private static func compressBitStringToModuleWidths(_ bits: String) -> [Int] {',
  'private static func quietZone(for format: WatchBarcodeFormat) -> Int {'
];

/**
 * A standalone Swift program built from the SHIPPED encoder source.
 *
 * `BarcodeGenerator.swift` imports SwiftUI/UIKit and so cannot be compiled for macOS
 * whole, but the encoders themselves are pure. Lifting them verbatim lets CI run the
 * real code instead of only reading it.
 */
const buildHarness = (source: string) => {
  const delimiter = source.match(/private static let code39Delimiter = "[13]{9}"/)?.[0];

  if (!delimiter) {
    throw new Error('Unable to find code39Delimiter in BarcodeGenerator.swift');
  }

  const members = [delimiter, ...HARNESS_DECLARATIONS.map((s) => swiftDeclaration(source, s))]
    .map((member) => '  ' + member.replace(/^ +/, '').replace(/^private /, ''))
    .join('\n\n');

  return [
    swiftDeclaration(source, 'enum WatchBarcodeFormat: String {'),
    `enum Encoders {\n${members}\n}`,
    'func render(_ m: [Int]?) -> String {',
    '  m.map { $0.map(String.init).joined(separator: ",") } ?? "nil"',
    '}',
    'while let line = readLine(strippingNewline: true) {',
    '  let parts = line.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)',
    '    .map(String.init)',
    '  guard parts.count == 2, let format = WatchBarcodeFormat(rawValue: parts[0]) else { continue }',
    '  let modules: [Int]?',
    '  switch format {',
    '  case .EAN13: modules = Encoders.encodeEAN13(value: parts[1])',
    '  case .EAN8: modules = Encoders.encodeEAN8(value: parts[1])',
    '  case .UPCA: modules = Encoders.encodeUPCA(value: parts[1])',
    '  case .CODE39: modules = Encoders.encodeCode39(value: parts[1])',
    '  case .CODE128: modules = Encoders.encodeCode128(value: parts[1])',
    '  default: modules = nil',
    '  }',
    '  print("\\(parts[0])|\\(parts[1])|\\(render(modules))")',
    '}'
  ].join('\n');
};

/** Run the harness over `cases`, returning "FORMAT|value" -> module string. */
const runSwiftEncoders = (cases: ReadonlyArray<{ format: string; value: string }>) => {
  // Assemble BEFORE creating the temp directory. Extraction throws when a pinned
  // declaration has moved or been renamed, and doing it first means that failure has
  // nothing to clean up — rather than skipping a `finally` that had not been entered yet.
  const harnessSource = buildHarness(readGenerator());
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-barcode-'));
  const harness = path.join(directory, 'EncoderHarness.swift');

  try {
    fs.writeFileSync(harness, harnessSource);

    let stdout: string;

    try {
      stdout = execFileSync('xcrun', ['--sdk', 'macosx', 'swift', harness], {
        input: cases.map(({ format, value }) => `${format}|${value}`).join('\n'),
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024
      });
    } catch (error) {
      // Swift prints ~40 lines of LLVM stack dump after a trap, which buries the one
      // line that says what went wrong. Keep the diagnosis, drop the noise.
      const output = String(
        (error as { stderr?: Buffer | string }).stderr ?? (error as Error).message
      );
      const diagnosis = output
        .split('\n')
        .filter((line) => /Fatal error|error:|warning:/.test(line))
        .slice(0, 8)
        .join('\n');

      // Swift's line number refers to the assembled harness, which is deleted below and
      // does not share BarcodeGenerator.swift's numbering. Quote the line itself, so the
      // offending code is greppable in the real source.
      const harnessLine = Number(output.match(/EncoderHarness\.swift:(\d+)/)?.[1]);
      const culprit = Number.isFinite(harnessLine)
        ? '\n\nThat line, lifted verbatim from BarcodeGenerator.swift (grep for it there — ' +
          `the number above is harness-relative):\n    ${harnessSource.split('\n')[harnessLine - 1]?.trim()}`
        : '';

      throw new Error(
        'The encoders lifted from BarcodeGenerator.swift failed to run. A "Fatal error: ' +
          'Unexpectedly found nil" here means an encoder force-unwraps something that can be ' +
          `nil — a crash on real card data, not a wrong barcode.\n\n${diagnosis || output.slice(0, 600)}${culprit}`
      );
    }

    return new Map(
      stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const separator = line.lastIndexOf('|');

          return [line.slice(0, separator), line.slice(separator + 1)] as const;
        })
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
};

const readGenerator = () => fs.readFileSync(generatorPath, 'utf8');

/** Body of a `switch format { ... }` inside the named function. */
const switchBody = (source: string, funcSignature: string) => {
  const start = source.indexOf(funcSignature);

  if (start === -1) {
    throw new Error(`Unable to find ${funcSignature} in BarcodeGenerator.swift`);
  }

  const open = source.indexOf('switch format {', start);
  const close = source.indexOf('\n    }', open);

  return source.slice(open, close);
};

/** `case .EAN13: return encodeEAN13(...)` -> { EAN13: 'encodeEAN13' } */
const parseEncoderMap = (source: string) => {
  const body = switchBody(source, 'private static func modules(for format: WatchBarcodeFormat');
  const map: Record<string, string> = {};

  for (const match of body.matchAll(/case \.(\w+): return (encode\w+|nil)/g)) {
    const [, format, encoder] = match;

    if (format && encoder) {
      map[format] = encoder;
    }
  }

  return map;
};

/** `case .CODE39, .CODE128: return 10` -> { CODE39: 10, CODE128: 10 } */
const parseQuietZones = (source: string) => {
  const body = switchBody(source, 'private static func quietZone(for format: WatchBarcodeFormat');
  const map: Record<string, number> = {};

  for (const match of body.matchAll(/case ((?:\.\w+(?:, )?)+): return (\d+)/g)) {
    const [, names, modules] = match;

    if (!names || !modules) {
      continue;
    }

    for (const name of names.split(', ')) {
      map[name.replace('.', '')] = Number(modules);
    }
  }

  return map;
};

/** `private static let <name>: [String] = [ "a", "b" ]` -> ['a', 'b'] */
const parseStringArray = (source: string, name: string) => {
  const declaration = `private static let ${name}: [String] = [`;
  const start = source.indexOf(declaration);

  if (start === -1) {
    throw new Error(`Unable to find ${name} in BarcodeGenerator.swift`);
  }

  // Offset past the declaration: its own `[String]` closes before the array does.
  const open = start + declaration.length;
  const body = source.slice(open, source.indexOf(']', open));

  return [...body.matchAll(/"([01]+)"/g)].map((match) => match[1]);
};

/**
 * The `widthsTable` local to `encodeCode128`, as element-width strings.
 *
 * A local `let`, not a static member, so `parseStringArray` cannot reach it — and its widths
 * run 1-4 rather than the EAN tables' binary. `swiftDeclaration` does the bracket matching.
 */
const parseCode128Widths = (source: string) =>
  [...swiftDeclaration(source, 'let widthsTable: [String] = [').matchAll(/"(\d+)"/g)]
    .map((match) => match[1])
    // A capture group always matches when its pattern does; the filter is here to narrow
    // `string | undefined` away, so the widths can be measured rather than only compared.
    .filter((widths) => widths !== undefined);

/** `private static let code39Patterns: [Character: String] = [ "A": "31..." ]` */
const parseCode39Table = (source: string) => {
  const start = source.indexOf('private static let code39Patterns: [Character: String] = [');

  if (start === -1) {
    throw new Error('Unable to find code39Patterns in BarcodeGenerator.swift');
  }

  const body = source.slice(start, source.indexOf('\n  ]', start));
  const table: Record<string, string> = {};

  for (const match of body.matchAll(/"(.)": "([13]{9})"/g)) {
    const [, character, pattern] = match;

    if (character && pattern) {
      table[character] = pattern;
    }
  }

  return table;
};

describe('watch barcode symbology contract', () => {
  it('no longer substitutes Code128 for EAN-8, UPC-A or Code39', () => {
    const source = readGenerator();

    // The exact defect Story 16.28 removed. A "temporary" reintroduction of any of
    // these arms ships a symbol that claims to be a symbology the card is not.
    expect(source).not.toContain('case .EAN8, .UPCA, .CODE39');
    expect(source).not.toContain('render as Code128 so scanners can still read it');

    const encoders = parseEncoderMap(source);

    expect(encoders.EAN8).not.toBe('encodeCode128');
    expect(encoders.UPCA).not.toBe('encodeCode128');
    expect(encoders.CODE39).not.toBe('encodeCode128');
  });

  it('parses digits without a trapping force-unwrap in any encoder', () => {
    const source = readGenerator();

    // `Character.isWholeNumber` is true for non-ASCII numerals whose `Int(String(_:))`
    // is nil, so the `.map { Int(String($0))! }` idiom traps on them — a crash, not a
    // wrong barcode. It is gone from the whole file, not merely from the encoders
    // Story 16.28 introduced.
    // Matched by SHAPE rather than by one exact spelling, so a differently-written but
    // equally unsafe variant — `Int(String(ch))!`, `Int("\(c)")!` — is caught too.
    const unsafeParse = /Int\(\s*(?:String\(|")[^)]*\)?\s*\)!/;
    const offending = source
      .split('\n')
      .map((text, index) => ({ line: index + 1, text: text.trim() }))
      .filter(({ text }) => unsafeParse.test(text));

    expect(offending).toEqual([]);
    expect(source).toMatch(/private static func asciiDigits\(of \w+: String\) -> \[Int\]\?/);

    // Every EAN/UPC-family encoder routes its digit parsing through the safe helper. The
    // helper NAME is asserted, not a full call expression, so renaming its parameter does
    // not fail a test that has no business caring about it.
    for (const encoder of ['encodeEAN13', 'encodeEAN8', 'encodeUPCA']) {
      const body = swiftDeclaration(
        source,
        `private static func ${encoder}(value: String) -> [Int]? {`
      );

      expect(body).toMatch(/asciiDigits\(/);
    }
  });

  it('gives every linear format its own distinct encoder', () => {
    const encoders = parseEncoderMap(readGenerator());

    expect(encoders).toEqual({
      EAN13: 'encodeEAN13',
      CODE128: 'encodeCode128',
      EAN8: 'encodeEAN8',
      UPCA: 'encodeUPCA',
      CODE39: 'encodeCode39',
      // QR is drawn by Core Image, never by the module renderer.
      QR: 'nil'
    });

    const linear = Object.values(encoders).filter((encoder) => encoder !== 'nil');

    expect(new Set(linear).size).toBe(linear.length);
  });

  it('bumps the image cache version so stale Code128 images are not served', () => {
    const source = readGenerator();
    const version = source.match(/private static let cacheVersion = "([^"]+)"/)?.[1];

    // The cache key is value+format+size and carries no renderer version of its own, so a
    // card cached under a superseded version keeps being served the symbol that version drew.
    // Each entry below is a version whose Code 128 or symbology output is now known wrong:
    //   v2 — EAN-8, UPC-A and Code39 were drawn as Code128 (Story 16.28).
    //   v3 — every Code 128 symbol was missing its final 2-module stop bar (Story 16.37).
    // Append, never replace: dropping an old value lets that bump be quietly reverted.
    const SUPERSEDED = ['watch-barcode-v2', 'watch-barcode-v3'];

    expect(version).toBeDefined();
    expect(SUPERSEDED).not.toContain(version);
  });

  it('keeps the six-format contract in step with the shared card schema', () => {
    // Two-space indent isolates the `WatchBarcodeFormat` cases; the switch cases
    // inside functions are indented four.
    const swiftCases = [...readGenerator().matchAll(/^ {2}case (\w+)$/gm)].map((match) => match[1]);
    const schema = fs.readFileSync(cardSchemaPath, 'utf8');
    const schemaFormats = [
      ...(schema.match(/barcodeFormatSchema = z\.enum\(\[([^\]]+)\]\)/)?.[1] ?? '').matchAll(
        /'(\w+)'/g
      )
    ].map((match) => match[1]);

    // Six formats, fixed by decision in Story 16.23. This story implements three of
    // them properly; it adds and removes none.
    expect(schemaFormats).toHaveLength(6);
    expect([...swiftCases].sort()).toEqual([...schemaFormats].sort());
  });

  it('matches the BWIPP EAN/UPC digit tables', () => {
    const source = readGenerator();

    expect(parseStringArray(source, 'eanLeftOddPatterns')).toEqual(REFERENCE_EAN_LEFT_ODD);
    expect(parseStringArray(source, 'eanRightPatterns')).toEqual(REFERENCE_EAN_RIGHT);
  });

  it('matches the BWIPP Code 39 character table', () => {
    const source = readGenerator();
    const delimiter = source.match(/private static let code39Delimiter = "([13]{9})"/)?.[1];

    expect(delimiter).toBe(REFERENCE_CODE39_DELIMITER);
    expect(parseCode39Table(source)).toEqual(REFERENCE_CODE39);
  });

  it('keeps every Code 39 pattern structurally valid', () => {
    const table = parseCode39Table(readGenerator());

    // Nine elements — five bars, four spaces — exactly three of them wide.
    expect(Object.keys(table)).toHaveLength(43);

    for (const pattern of Object.values(table)) {
      expect(pattern).toHaveLength(9);
      expect([...pattern].filter((width) => width === '3')).toHaveLength(3);
      expect(pattern).toMatch(/^[13]{9}$/);
    }

    expect(new Set(Object.values(table)).size).toBe(43);
  });

  it('terminates every Code 128 symbol with the full stop pattern', () => {
    const table = parseCode128Widths(readGenerator());

    // Code words run 0...106 and no further — `encodeCode128` never appends one above 106, so
    // anything past the end is unreachable. It is not harmless: it pushes the STOP out of the
    // table's last slot, and a six-character entry stops looking wrong among six-character
    // neighbours. That is how a truncated "233111" survived three stories of barcode work.
    expect(table).toHaveLength(107);

    for (const [index, widths] of Object.entries(REFERENCE_CODE128_DELIMITERS)) {
      expect(table[Number(index)]).toBe(widths);
    }

    // The STOP is the ONE seven-element code word. Its trailing 2-module BAR is what a decoder
    // matches to terminate the read; without it the symbol ends on a space and is
    // indistinguishable from a scan that was cut short.
    const modules = (widths: string) => [...widths].reduce((sum, w) => sum + Number(w), 0);

    const stop = table[106] ?? '';

    expect(stop).toHaveLength(7);
    expect(modules(stop)).toBe(13);

    // Every other code word is six elements over 11 modules.
    for (const widths of table.slice(0, 106)) {
      expect(widths).toHaveLength(6);
      expect(modules(widths)).toBe(11);
    }
  });

  it('uses the published per-symbology quiet zone minima', () => {
    // A flat margin narrows every bar on a wrist-sized symbol for no benefit.
    expect(parseQuietZones(readGenerator())).toEqual(REFERENCE_QUIET_ZONES);
  });

  // The assertions above read the Swift source. This one RUNS it: CI has no test
  // action for `watch-ios/Tests/`, so without this nothing would execute an encoder
  // and a change that kept the names and tables intact while breaking the maths —
  // `encodeUPCA` delegating to `encodeCode128`, a flipped check-digit weight, an
  // off-by-one slice — would pass every other gate on a non-OTA native path.
  const describeOnMac = process.platform === 'darwin' ? describe : describe.skip;

  describeOnMac('executed against the real Swift encoders', () => {
    it('reproduces every BWIPP reference symbol, and refuses every unencodable value', () => {
      const results = runSwiftEncoders([...REFERENCE_SYMBOLS, ...UNENCODABLE]);

      for (const { format, value, modules } of REFERENCE_SYMBOLS) {
        expect(results.get(`${format}|${value}`)).toBe(modules);
      }

      for (const { format, value } of UNENCODABLE) {
        expect(results.get(`${format}|${value}`)).toBe('nil');
      }
    }, 120_000);
  });
});
