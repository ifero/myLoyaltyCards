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
  // Non-ASCII numerals: `isWholeNumber` is true, but every reading of them is wrong.
  { format: 'EAN8', value: '\u0663' + '5200002' },
  { format: 'UPCA', value: '\u3248' + '12345000058' }
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

/** Declarations the harness needs; all are pure and free of SwiftUI/UIKit. */
const HARNESS_DECLARATIONS = [
  'private static let eanLeftOddPatterns: [String] = [',
  'private static let eanRightPatterns: [String] = [',
  'private static func asciiDigits(of value: String) -> [Int]? {',
  'private static func upcEANCheckDigit(for digits: [Int]) -> Int {',
  'private static func encodeEAN8(value: String) -> [Int]? {',
  'private static func encodeUPCA(value: String) -> [Int]? {',
  'private static let code39Patterns: [Character: String] = [',
  'private static func encodeCode39(value: String) -> [Int]? {',
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
    '  case .EAN8: modules = Encoders.encodeEAN8(value: parts[1])',
    '  case .UPCA: modules = Encoders.encodeUPCA(value: parts[1])',
    '  case .CODE39: modules = Encoders.encodeCode39(value: parts[1])',
    '  default: modules = nil',
    '  }',
    '  print("\\(parts[0])|\\(parts[1])|\\(render(modules))")',
    '}'
  ].join('\n');
};

/** Run the harness over `cases`, returning "FORMAT|value" -> module string. */
const runSwiftEncoders = (cases: ReadonlyArray<{ format: string; value: string }>) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'watch-barcode-'));
  const harness = path.join(directory, 'EncoderHarness.swift');

  try {
    fs.writeFileSync(harness, buildHarness(readGenerator()));

    const stdout = execFileSync('xcrun', ['--sdk', 'macosx', 'swift', harness], {
      input: cases.map(({ format, value }) => `${format}|${value}`).join('\n'),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024
    });

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

  it('parses digits without a trapping force-unwrap in the new encoders', () => {
    const source = readGenerator();
    const start = source.indexOf('private static func encodeEAN8');
    const end = source.indexOf('// MARK: Code 39');
    const newEncoders = source.slice(start, end);

    // `Character.isWholeNumber` is true for non-ASCII numerals whose `Int(String(_:))`
    // is nil, so the older `.map { Int(String($0))! }` idiom traps on them.
    expect(newEncoders).not.toContain('Int(String($0))!');
    expect(newEncoders).toContain('asciiDigits(of: value)');
    expect(source).toContain('private static func asciiDigits(of value: String) -> [Int]?');
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

    // An EAN-8 card already has a *Code128* image cached under v2, keyed by the same
    // value+format+size. Without a bump the device keeps serving the wrong symbol.
    expect(version).toBeDefined();
    expect(version).not.toBe('watch-barcode-v2');
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
