/**
 * Tests for the Wear OS catalogue generator (Story 10.2, AC9).
 *
 * Every test redirects generation to a throwaway directory via
 * `WEAR_CATALOGUE_OUTPUT_PATH`, so the tracked
 * `watch-android/…/Generated/Brands.kt` is never mutated by the suite — the same
 * test-safety mechanism `targets/watch/__tests__/generate-catalogue.test.ts` uses for
 * `Brands.swift`. The one test that deliberately runs against the tracked file
 * (`the committed artifact is in sync…`) uses `--check`, which never writes.
 *
 * The emitted string literals are verified by DECODING them with an unescaper written
 * here, independently of the generator's escaper, rather than by asserting on substrings
 * alone. Two consequences worth the extra code: a full field-by-field round-trip against
 * `catalogue/italy.json` becomes possible, and the decoder throws on any escape Kotlin
 * does not define — so it also pins the escape set itself.
 *
 * `kotlinc` is not a dependency of this repo, so nothing here compiles the output.
 * Compilation is proven by `./gradlew assembleDebug` (AC8) and by CI's Wear OS build job.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(REPO_ROOT, 'scripts', 'generate-wear-catalogue.mjs');
const CATALOGUE_PATH = path.join(REPO_ROOT, 'catalogue', 'italy.json');
const ARTIFACT_RELATIVE =
  'watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/Generated/Brands.kt';
const COMMITTED_ARTIFACT = path.join(REPO_ROOT, ARTIFACT_RELATIVE);
const SIDECAR_RELATIVE = path.posix.join(
  path.posix.dirname(ARTIFACT_RELATIVE),
  '.catalogue-inputs.sha256'
);
const SWIFT_ARTIFACT = path.join(REPO_ROOT, 'targets/watch/Generated/Brands.swift');
const BARCODE_SCHEMA = path.join(REPO_ROOT, 'core/schemas/card.ts');

type CatalogueBrand = {
  id: string;
  name: string;
  aliases: string[];
  logo: string;
  color: string;
  defaultFormat?: string;
};

type ParsedBrand = {
  id: string;
  name: string;
  aliases: string[];
  logo: string;
  color: string;
  defaultFormat: string | null;
};

const readCatalogue = (): { version: string; brands: CatalogueBrand[] } =>
  JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf8'));

// --- Kotlin literal decoding (deliberately not the generator's encoder) -------------

/**
 * Kotlin's complete escape set, per kotlinlang's Characters reference: `\t \b \n \r \'
 * \" \\ \$` plus `\uXXXX`. Anything else is not a Kotlin escape, so `decodeKotlinString`
 * throwing on an unlisted marker is what stops the generator from inventing one (a `\f`,
 * say, which Kotlin does not have).
 */
const KOTLIN_UNESCAPES: Record<string, string> = {
  t: '\t',
  b: '\b',
  n: '\n',
  r: '\r',
  "'": "'",
  '"': '"',
  '\\': '\\',
  $: '$'
};

const decodeKotlinString = (literal: string): string => {
  if (!literal.startsWith('"') || !literal.endsWith('"') || literal.length < 2) {
    throw new Error(`Not a Kotlin string literal: ${literal}`);
  }

  const body = literal.slice(1, -1);
  let decoded = '';
  let index = 0;

  while (index < body.length) {
    const char = body.charAt(index);
    if (char !== '\\') {
      decoded += char;
      index += 1;
      continue;
    }

    const marker = body.charAt(index + 1);
    if (marker === '') throw new Error(`Dangling backslash in ${literal}`);

    if (marker === 'u') {
      const hex = body.slice(index + 2, index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
        throw new Error(`Malformed \\u escape in ${literal}`);
      }
      decoded += String.fromCharCode(Number.parseInt(hex, 16));
      index += 6;
      continue;
    }

    const replacement = KOTLIN_UNESCAPES[marker];
    if (replacement === undefined) {
      throw new Error(`\\${marker} is not a Kotlin escape sequence (in ${literal})`);
    }
    decoded += replacement;
    index += 2;
  }

  return decoded;
};

/** Splits an argument list at its top-level commas, respecting string literals. */
const splitTopLevel = (source: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let index = 0;

  while (index < source.length) {
    const char = source.charAt(index);

    if (inString) {
      current += char;
      if (char === '\\') {
        current += source.charAt(index + 1);
        index += 2;
        continue;
      }
      if (char === '"') inString = false;
      index += 1;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '(') depth += 1;
    else if (char === ')') depth -= 1;
    else if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  if (current.trim() !== '') parts.push(current.trim());
  return parts;
};

const parseBrands = (source: string): ParsedBrand[] =>
  [...source.matchAll(/^ {8}WearBrand\((.+)\),$/gm)].map((match) => {
    const line = match[0];
    const argumentList = match[1];
    if (argumentList === undefined) throw new Error(`Unparseable brand line: ${line}`);

    const fields = new Map(
      splitTopLevel(argumentList).map((argument) => {
        const separator = argument.indexOf(' = ');
        if (separator === -1) throw new Error(`Expected a named argument, got: ${argument}`);
        return [argument.slice(0, separator), argument.slice(separator + 3)] as const;
      })
    );

    const raw = (key: string): string => {
      const value = fields.get(key);
      if (value === undefined) throw new Error(`WearBrand(…) has no "${key}": ${line}`);
      return value;
    };

    const aliases = raw('aliases');

    return {
      id: decodeKotlinString(raw('id')),
      name: decodeKotlinString(raw('name')),
      aliases:
        aliases === 'emptyList()'
          ? []
          : splitTopLevel(aliases.replace(/^listOf\(/, '').replace(/\)$/, '')).map(
              decodeKotlinString
            ),
      logo: decodeKotlinString(raw('logo')),
      color: decodeKotlinString(raw('color')),
      defaultFormat:
        raw('defaultFormat') === 'null' ? null : decodeKotlinString(raw('defaultFormat'))
    };
  });

/**
 * Drops KDoc blocks and whole-line `//` comments so an assertion about the CODE is not
 * satisfied (or defeated) by prose in the header. Only strips `//` at the start of a
 * line, so a `//` inside a string literal survives.
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// --- Harness -------------------------------------------------------------------------

let workDir: string;
let outputPath: string;

type RunOptions = { args?: string[]; env?: Record<string, string> };

const runGenerator = ({ args = [], env = {} }: RunOptions = {}): string =>
  execFileSync(process.execPath, [GENERATOR, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, WEAR_CATALOGUE_OUTPUT_PATH: outputPath, ...env },
    stdio: 'pipe'
  }).toString('utf8');

/** Runs the generator expecting a non-zero exit, and returns its combined output. */
const runExpectingFailure = (options: RunOptions = {}): { status: number; output: string } => {
  try {
    runGenerator(options);
  } catch (error) {
    const failure = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      status: failure.status ?? -1,
      output: `${failure.stdout?.toString('utf8') ?? ''}${failure.stderr?.toString('utf8') ?? ''}`
    };
  }
  throw new Error('Expected the generator to exit non-zero, but it succeeded.');
};

/** Writes a catalogue fixture and returns its path. */
const writeFixture = (brands: unknown[], version = '2026-02-13'): string => {
  const fixturePath = path.join(workDir, 'fixture-catalogue.json');
  fs.writeFileSync(fixturePath, JSON.stringify({ version, brands }), 'utf8');
  return fixturePath;
};

const brandFixture = (overrides: Partial<CatalogueBrand> = {}): CatalogueBrand => ({
  id: 'brand-special',
  name: 'Special Brand',
  aliases: ['special'],
  logo: 'demo',
  color: '#123456',
  ...overrides
});

const generatedSource = (): string => fs.readFileSync(outputPath, 'utf8');
const sidecarPath = (): string => path.join(path.dirname(outputPath), '.catalogue-inputs.sha256');

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wear-catalogue-'));
  outputPath = path.join(workDir, 'Generated', 'Brands.kt');
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

// --- Generated content (AC1, AC2, AC3) -----------------------------------------------

describe('Wear OS catalogue generation', () => {
  it('emits every catalogue brand, ordered by id', () => {
    runGenerator();

    const catalogue = readCatalogue();
    const emitted = parseBrands(generatedSource()).map((brand) => brand.id);
    const expected = catalogue.brands.map((brand) => brand.id).sort();

    // Compared against the catalogue's own length rather than a hardcoded count: the
    // catalogue grows, and a magic number would turn every new brand into a test edit.
    expect(emitted).toHaveLength(catalogue.brands.length);
    expect(emitted).toEqual(expected);
  });

  it('round-trips every field of every brand', () => {
    runGenerator();

    const expected: ParsedBrand[] = readCatalogue()
      .brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        aliases: brand.aliases,
        logo: brand.logo,
        color: brand.color,
        defaultFormat: brand.defaultFormat ?? null
      }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));

    expect(parseBrands(generatedSource())).toEqual(expected);
  });

  it('exposes the catalogue version', () => {
    runGenerator();

    expect(generatedSource()).toContain(`const val VERSION: String = "${readCatalogue().version}"`);
  });

  it('declares an immutable data class in the wear package', () => {
    runGenerator();
    const code = stripComments(generatedSource());

    expect(code).toContain('package com.iferoporefi.myloyaltycards.wear.generated');
    expect(code).toContain('data class WearBrand(');
    expect(code).toContain('val defaultFormat: String?,');
    expect(code).not.toMatch(/\bvar\b/);
  });

  it('needs no imports, no parsing, no file I/O and no reflection at runtime', () => {
    runGenerator();
    const code = stripComments(generatedSource());

    // The point of generating this file is that reading brand data cannot fail at
    // runtime. Any of these appearing would mean it can.
    expect(code).not.toMatch(/^import /m);
    expect(code).not.toMatch(/JSON|Json/);
    expect(code).not.toMatch(/readText|openRawResource|assets|File\(/);
    expect(code).not.toMatch(/::class|javaClass|Class\.forName/);
  });

  it('carries a do-not-edit header naming the generator and the source', () => {
    runGenerator();
    const source = generatedSource();

    expect(source).toContain('// DO NOT EDIT — This file is auto-generated.');
    expect(source).toContain('// Generated by scripts/generate-wear-catalogue.mjs');
    expect(source).toContain('// Source: catalogue/italy.json');
    expect(source).toContain('yarn wear:catalogue:generate');
  });
});

// --- Determinism (AC1) ---------------------------------------------------------------

describe('determinism', () => {
  it('produces byte-identical output across two independent runs', () => {
    runGenerator();
    const first = generatedSource();

    // Remove both the artifact and the sidecar so the second run genuinely regenerates
    // rather than taking the incremental-skip path.
    fs.rmSync(outputPath);
    fs.rmSync(sidecarPath());

    runGenerator();
    expect(generatedSource()).toBe(first);
  });

  it('keeps provenance repo-relative, so output does not depend on checkout location', () => {
    runGenerator();
    const header = generatedSource().split('\n').slice(0, 8).join('\n');

    expect(header).not.toContain(REPO_ROOT);
    expect(header).not.toMatch(/Source: \//);
    expect(header).not.toMatch(/Generated by \//);
  });

  it('sorts brands by id even when the catalogue is in another order', () => {
    const cataloguePath = writeFixture([
      brandFixture({ id: 'zulu' }),
      brandFixture({ id: 'alpha' }),
      brandFixture({ id: 'mike' })
    ]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });

    expect(parseBrands(generatedSource()).map((brand) => brand.id)).toEqual([
      'alpha',
      'mike',
      'zulu'
    ]);
  });
});

// --- Escaping (AC2, AC3) -------------------------------------------------------------

describe('Kotlin string escaping', () => {
  it('escapes backslash, quote, dollar and control characters', () => {
    // The trailing form feed is the interesting one: Kotlin has no `\f` escape (unlike
    // Java and C), so it is the case that forces the `\uXXXX` fallback.
    const name = 'A\\B "C" $D ${E} \n\t\r\bF\fG';
    const cataloguePath = writeFixture([
      brandFixture({ name, aliases: ['plain', 'a\\b', 'q"q', '$tpl', '${expr}'] })
    ]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });
    const source = generatedSource();

    // The literal text: a bare `$` would open a Kotlin string template, and the form
    // feed must leave as a `\u` escape — never raw, never as a non-existent `\f`.
    expect(source).toContain('name = "A\\\\B \\"C\\" \\$D \\${E} \\n\\t\\r\\bF\\u000cG"');
    expect(source).toContain('"\\$tpl"');
    expect(source).toContain('"\\${expr}"');

    // …and the meaning: decoding the emitted literals returns the input exactly.
    const [brand] = parseBrands(source);
    expect(brand?.name).toBe(name);
    expect(brand?.aliases).toEqual(['plain', 'a\\b', 'q"q', '$tpl', '${expr}']);
  });

  it('leaves apostrophes unescaped — Italian brand names are full of them', () => {
    const cataloguePath = writeFixture([brandFixture({ name: "Spicciolo d'Oro" })]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });

    expect(generatedSource()).toContain(`name = "Spicciolo d'Oro"`);
  });

  it('round-trips parentheses and commas inside literals', () => {
    // These are the characters that collide with the *syntax* around the literals:
    // `WearBrand(…)` and `listOf(…)` are paren-delimited and comma-separated, so a name
    // like `Foo (Bar), Baz` is what distinguishes a parser that tracks string state from
    // one that just splits on commas. Nothing in the catalogue has them today.
    const name = 'Foo (Bar), Baz';
    const aliases = ['a, b', '(c)', 'listOf(", ")'];
    const cataloguePath = writeFixture([brandFixture({ name, aliases })]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });

    const [brand] = parseBrands(generatedSource());
    expect(brand?.name).toBe(name);
    expect(brand?.aliases).toEqual(aliases);
  });

  it('renders an empty aliases list as emptyList(), never null', () => {
    const cataloguePath = writeFixture([
      brandFixture({ id: 'no-aliases', aliases: [] }),
      brandFixture({ id: 'one-alias', aliases: ['solo'] })
    ]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });
    const source = generatedSource();

    expect(source).toContain('aliases = emptyList()');
    expect(source).toContain('aliases = listOf("solo")');
    expect(parseBrands(source).map((brand) => brand.aliases)).toEqual([[], ['solo']]);
  });

  it('renders an absent defaultFormat as null and a present one as a string', () => {
    const cataloguePath = writeFixture([
      brandFixture({ id: 'no-format' }),
      brandFixture({ id: 'with-format', defaultFormat: 'EAN13' })
    ]);

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });

    expect(parseBrands(generatedSource()).map((brand) => brand.defaultFormat)).toEqual([
      null,
      'EAN13'
    ]);
  });
});

// --- --check drift mode (AC5) --------------------------------------------------------

describe('--check drift mode', () => {
  it('passes on a freshly generated artifact', () => {
    runGenerator();

    expect(runGenerator({ args: ['--check'] })).toContain('is in sync with catalogue/italy.json');
  });

  it('fails on a mutated artifact and names the fix command', () => {
    runGenerator();
    fs.writeFileSync(outputPath, '// hand-edited\n', 'utf8');

    const { status, output } = runExpectingFailure({ args: ['--check'] });

    expect(status).toBe(1);
    expect(output).toContain('is out of sync with catalogue/italy.json');
    expect(output).toContain('yarn wear:catalogue:generate');
  });

  it('reports a missing artifact distinctly from a stale one', () => {
    const { status, output } = runExpectingFailure({ args: ['--check'] });

    expect(status).toBe(1);
    expect(output).toContain('is missing');
    expect(output).toContain('yarn wear:catalogue:generate');
    expect(output).not.toContain('out of sync');
  });

  it('writes nothing at all — not the artifact, not the sidecar', () => {
    runGenerator();
    const before = generatedSource();
    fs.rmSync(sidecarPath());

    runGenerator({ args: ['--check'] });

    expect(generatedSource()).toBe(before);
    // A --check that left a sidecar behind would make the next `generate` skip on the
    // strength of a check run, which is not something a read-only mode may decide.
    expect(fs.existsSync(sidecarPath())).toBe(false);
  });

  it('the committed artifact is in sync with the catalogue', () => {
    // The only test that runs against the tracked file. `--check` is read-only, so this
    // is safe — and it makes `yarn test` a second drift gate alongside pre-push and CI.
    expect(fs.existsSync(COMMITTED_ARTIFACT)).toBe(true);

    const output = runGenerator({ args: ['--check'], env: { WEAR_CATALOGUE_OUTPUT_PATH: '' } });

    expect(output).toContain('Brands.kt is in sync with catalogue/italy.json');
  });
});

// --- Incremental skip (AC7) ----------------------------------------------------------

describe('incremental generation', () => {
  it('leaves the artifact untouched when inputs have not changed', () => {
    runGenerator();
    const before = fs.statSync(outputPath).mtimeMs;

    expect(runGenerator()).toContain('Inputs unchanged');
    expect(fs.statSync(outputPath).mtimeMs).toBe(before);
  });

  it('regenerates when the catalogue changes', () => {
    runGenerator();
    const before = generatedSource();

    const cataloguePath = writeFixture([brandFixture({ id: 'brand-new', name: 'Brand New' })]);
    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath } });

    const after = generatedSource();
    expect(after).not.toBe(before);
    expect(after).toContain('id = "brand-new"');
  });

  it('regenerates when only the version changes', () => {
    // A catalogue release that adds no brands still bumps `version`, and that value is
    // compiled in. Guaranteed by hashing the whole file, but worth pinning: a future
    // "optimisation" that hashed only the brands array would silently ship a stale
    // VERSION and make 10-6's sync debugging misleading rather than merely harder.
    const brands = [brandFixture()];
    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: writeFixture(brands, '2026-03-01') } });
    expect(generatedSource()).toContain('const val VERSION: String = "2026-03-01"');

    runGenerator({ env: { WEAR_CATALOGUE_JSON_PATH: writeFixture(brands, '2026-04-01') } });
    expect(generatedSource()).toContain('const val VERSION: String = "2026-04-01"');
  });

  it('repairs a hand-edited artifact instead of skipping it', () => {
    runGenerator();
    const generated = generatedSource();

    // Inputs are unchanged, so an inputs-only skip check would leave this edit in place
    // while --check kept failing and telling the developer to run exactly this command.
    fs.writeFileSync(outputPath, '// hand-edited\n', 'utf8');
    runGenerator();

    expect(generatedSource()).toBe(generated);
  });
});

// --- Input validation ----------------------------------------------------------------

describe('catalogue validation', () => {
  it('refuses a field it does not emit, rather than dropping it silently', () => {
    const cataloguePath = writeFixture([{ ...brandFixture(), country: 'IT' }]);

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('has field "country"');
    expect(output).toContain('scripts/generate-wear-catalogue.mjs');
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it('refuses duplicate brand ids, which would make the sort order ambiguous', () => {
    const cataloguePath = writeFixture([
      brandFixture({ id: 'twin' }),
      brandFixture({ id: 'twin' })
    ]);

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('duplicate brand ids: twin');
  });

  it('refuses a brand missing a required field', () => {
    const withoutName: Record<string, unknown> = { ...brandFixture() };
    delete withoutName.name;
    const cataloguePath = writeFixture([withoutName]);

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('missing a non-empty string "name"');
  });

  it('refuses an unpaired UTF-16 surrogate rather than emitting U+FFFD', () => {
    // `JSON.parse` accepts a lone `\uD800`, and writing it out would silently become
    // U+FFFD on UTF-8 encode: a corrupted brand name that still compiles AND still
    // passes the drift check, which is the worst combination available.
    const fixturePath = path.join(workDir, 'lone-surrogate.json');
    fs.writeFileSync(
      fixturePath,
      '{"version":"2026-02-13","brands":[{"id":"lone","name":"Bad\\uD800Name","aliases":[],"logo":"l","color":"#fff"}]}',
      'utf8'
    );

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: fixturePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('Unpaired UTF-16 surrogate U+D800');
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it('refuses a defaultFormat outside barcodeFormatSchema', () => {
    const cataloguePath = writeFixture([brandFixture({ defaultFormat: 'PDF417' })]);

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('has defaultFormat "PDF417"');
    expect(output).toContain('core/schemas/card.ts');
  });

  it('refuses an empty brands array', () => {
    const cataloguePath = writeFixture([]);

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('needs a non-empty "brands" array');
  });

  it('refuses a version that is not an ISO date', () => {
    const cataloguePath = writeFixture([brandFixture()], 'v2');

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('needs a "version" ISO date');
  });

  it('names the file when the catalogue is not valid JSON', () => {
    const fixturePath = path.join(workDir, 'broken.json');
    fs.writeFileSync(fixturePath, '{ "version": ', 'utf8');

    const { status, output } = runExpectingFailure({
      env: { WEAR_CATALOGUE_JSON_PATH: fixturePath }
    });

    expect(status).toBe(1);
    expect(output).toContain('broken.json is not valid JSON');
  });
});

// --- The gates themselves (AC3 cross-platform parity, AC4, AC6, AC8) -----------------

/**
 * These assert the *wiring*, not the generator. AC6 calls the gate "the whole point of
 * the story", and AC4/AC8 are likewise properties of files outside this script that
 * nothing else would notice regressing — a `.gitignore` edit that re-ignores `Brands.kt`,
 * a `pre-push` rewrite that drops the check, a Gradle codegen task creeping back in. All
 * three were true when the story landed and had no guard keeping them true.
 */
describe('gate wiring', () => {
  it('un-ignores Brands.kt while ignoring the rest of its directory (AC4)', () => {
    // `--no-index` is load-bearing. Ignore rules do not apply to a path already in the
    // index, so once `Brands.kt` is committed — its permanent state — plain
    // `check-ignore` reports no matching rule at all and an assertion about the rule
    // shape silently stops testing anything. `--no-index` asks the question this test
    // actually means: what would the rules say about these paths?
    const rules = execFileSync(
      'git',
      ['check-ignore', '--no-index', '--non-matching', '-v', ARTIFACT_RELATIVE, SIDECAR_RELATIVE],
      { cwd: REPO_ROOT, stdio: 'pipe' }
    ).toString('utf8');

    const ruleFor = (target: string): string =>
      rules
        .split('\n')
        .find((line) => line.endsWith(`\t${target}`))
        ?.split('\t')[0] ?? '';

    // A leading `!` on the winning rule means an un-ignore won.
    expect(ruleFor(ARTIFACT_RELATIVE)).toContain(`!${ARTIFACT_RELATIVE}`);
    expect(ruleFor(SIDECAR_RELATIVE)).toContain(`${path.posix.dirname(ARTIFACT_RELATIVE)}/*`);
    expect(ruleFor(SIDECAR_RELATIVE)).not.toContain('!');

    // The decisive check, and the one AC4 words itself: the artifact is tracked, and it is
    // the ONLY thing tracked in that directory. Rules are a means; this is the end.
    expect(
      execFileSync('git', ['ls-files', path.posix.dirname(ARTIFACT_RELATIVE)], {
        cwd: REPO_ROOT,
        stdio: 'pipe'
      })
        .toString('utf8')
        .split('\n')
        .filter(Boolean)
    ).toEqual([ARTIFACT_RELATIVE]);
  });

  it('runs the drift check in pre-push and in CI quality gates (AC6)', () => {
    const scripts = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
    ).scripts;
    expect(scripts['wear:catalogue:generate']).toBe('node scripts/generate-wear-catalogue.mjs');
    expect(scripts['wear:catalogue:check']).toBe(
      'node scripts/generate-wear-catalogue.mjs --check'
    );

    // Whitespace-tolerant: the `|| exit 1` is what makes this a gate rather than a log
    // line, but how it is spaced is nobody's business. Nothing auto-formats this file
    // (prettier has no parser for an extensionless shell script), so the only thing that
    // could change the spacing is a human, and a human should not trip a gate test for it.
    const prePush = fs.readFileSync(path.join(REPO_ROOT, '.husky/pre-push'), 'utf8');
    expect(prePush).toMatch(/yarn\s+wear:catalogue:check\s*\|\|\s*exit\s+1/);

    // Isolate the step by YAML indentation rather than by a character window, so an
    // unrelated comment growing between the step and a later key cannot silently move
    // `continue-on-error` out of range and turn this assertion into a no-op.
    const workflow = fs.readFileSync(
      path.join(REPO_ROOT, '.github/workflows/ci-quality-gates.yml'),
      'utf8'
    );
    const steps = workflow.split(/\n {6}- /);
    const gateStep = steps.find((step) => /run:\s*yarn wear:catalogue:check\b/.test(step));

    expect(gateStep).toBeDefined();
    // A `continue-on-error` on this step would make the CI half of AC6 decorative.
    expect(gateStep).not.toContain('continue-on-error');
  });

  it('keeps the Gradle build free of any codegen step (AC8)', () => {
    // Listing the whole subtree and filtering in JS, rather than trusting a pathspec
    // glob: `watch-android/**/*.kts` happens to cover today's two nesting levels, but a
    // glob that silently matches nothing new is exactly how this guard would stop
    // guarding when Story 10-5 adds a module.
    const gradleFiles = execFileSync('git', ['ls-files', 'watch-android'], {
      cwd: REPO_ROOT,
      stdio: 'pipe'
    })
      .toString('utf8')
      .split('\n')
      .filter((file) => file.endsWith('.kts'));

    expect(gradleFiles).toEqual(
      expect.arrayContaining([
        'watch-android/settings.gradle.kts',
        'watch-android/build.gradle.kts',
        'watch-android/app/build.gradle.kts'
      ])
    );

    // Both signals track AC8's own wording — "requires no generator step … No Node, no
    // `.kts`, no codegen task" — rather than banning `Exec` outright. An `Exec` task is
    // not inherently a codegen task: `tasks.register<Exec>("gitHash") { commandLine("git",
    // "rev-parse", "HEAD") }` is a perfectly ordinary thing to add, and failing a test
    // named "catalogue" for it would send the next developer hunting in the wrong place.
    //
    // Accepted limit: this is a text guard, so a deliberately obfuscated invocation
    // (assembling "node" from characters, say) evades it. That is fine — it exists to
    // catch an accidental regression, not sabotage.
    const banned: [RegExp, string][] = [
      [/generate-wear-catalogue|Generated\/Brands\.kt/, 'references the catalogue generator'],
      [/['"](?:node|npx)['"]/, 'invokes Node, which AC8 says the Gradle build must not do'],
      // Catches a task registered but not yet wired up — `tasks.register<Exec>("regenCatalogue")
      // { /* TODO */ }` names nothing bannable until someone adds the command. Keyed on the
      // task NAME rather than the `Exec` type, so an unrelated `Exec` stays fine.
      //
      // A generation VERB is required next to the noun. Matching the noun alone flagged
      // `tasks.register<Copy>("copyBrandsAssets")` and `tasks.register("validateBrandsData")`
      // — plausible future tasks, and "brands" is this app's own domain vocabulary, so the
      // noun on its own is not evidence of anything. Accepted limit: a codegen task named
      // with a verb outside this list slips past THIS signal, but a finished one still has
      // to invoke the generator, which trips the other two.
      [
        /tasks\.register[^\n]*['"](?:regen|sync|generat)\w*(?:catalogue|catalog|brands)\w*['"]/i,
        'registers a task whose name suggests catalogue codegen'
      ]
    ];

    for (const file of gradleFiles) {
      // Comments stripped first: these files' prose explains at length that Gradle must
      // not run Node, and matching that would be a self-inflicted false positive.
      const source = stripComments(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
      for (const [pattern, why] of banned) {
        // The message matters: whoever hits this needs to know it is about keeping the
        // Wear build free of a catalogue codegen step, not about Gradle style.
        expect({ file, why, matched: pattern.test(source) }).toEqual({
          file,
          why,
          matched: false
        });
      }
    }

    // Pin both directions of the codegen-task signal. A guard this broad drifts toward
    // either uselessness or nuisance, and only fixtures keep it honest — the noun-only
    // version of this pattern flagged `copyBrandsAssets`, which is close to the
    // complication work this story's Out-of-scope section already anticipates.
    const taskNameSignal = banned.find(([, why]) => why.includes('catalogue codegen'));
    expect(taskNameSignal).toBeDefined();
    const catches = (source: string) => taskNameSignal?.[0].test(source);

    expect(catches('tasks.register<Exec>("regenerateCatalogue") { /* TODO */ }')).toBe(true);
    expect(catches('tasks.register("syncBrands") { }')).toBe(true);
    expect(catches('tasks.register("generateCatalogueEntries") { }')).toBe(true);

    expect(catches('tasks.register<Copy>("copyBrandsAssets") { from("x") }')).toBe(false);
    expect(catches('tasks.register("validateBrandsData") { doLast { } }')).toBe(false);
    expect(catches('tasks.register<Exec>("gitHash") { commandLine("git", "rev-parse") }')).toBe(
      false
    );
  });

  it('keeps WearBrand a superset of the watchOS WatchBrand (AC3)', () => {
    // AC3 constrains parity with `Brands.swift` specifically, and the two generators are
    // independent — nothing else would notice a field being added on one side only.
    const swift = fs.readFileSync(SWIFT_ARTIFACT, 'utf8');
    const swiftFields = [
      ...(swift.match(/struct WatchBrand[^{]*\{([\s\S]*?)\n\}/)?.[1] ?? '').matchAll(
        /let\s+(\w+)\s*:/g
      )
    ].map((match) => match[1]);

    expect(swiftFields).toEqual(['id', 'name', 'aliases']);

    const kotlin = fs.readFileSync(COMMITTED_ARTIFACT, 'utf8');
    const kotlinFields = [
      ...(kotlin.match(/data class WearBrand\(([\s\S]*?)\n\)/)?.[1] ?? '').matchAll(
        /val\s+(\w+)\s*:/g
      )
    ].map((match) => match[1]);

    // Superset, and in catalogue/types.ts declaration order.
    expect(kotlinFields).toEqual(['id', 'name', 'aliases', 'logo', 'color', 'defaultFormat']);
    for (const field of swiftFields) expect(kotlinFields).toContain(field);
  });

  it('documents exactly the barcode formats barcodeFormatSchema defines', () => {
    const enumBody = fs
      .readFileSync(BARCODE_SCHEMA, 'utf8')
      .match(/barcodeFormatSchema\s*=\s*z\.enum\(\[([^\]]*)\]\)/)?.[1];
    expect(enumBody).toBeDefined();

    const formats = [...(enumBody ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(formats.length).toBeGreaterThan(0);

    // Set-equality, not containment. Containment alone is one-directional: it catches a
    // format the KDoc forgot, but not a format REMOVED from the schema whose stale mention
    // lingers in the prose. The generator derives this list now, so both directions should
    // hold by construction — which is exactly why the test should be able to prove it.
    const documented = (
      fs
        .readFileSync(COMMITTED_ARTIFACT, 'utf8')
        .match(/@property defaultFormat[\s\S]*?otherwise null/)?.[0] ?? ''
    ).match(/`([A-Z0-9]+)`/g);

    expect(documented?.map((token) => token.replaceAll('`', '')).sort()).toEqual(
      [...formats].sort()
    );
  });
});

// --- The derived-enum safety net (its own failure branch) ----------------------------

describe('barcodeFormatSchema derivation', () => {
  it('fails loudly when the schema cannot be parsed, rather than skipping validation', () => {
    // `readBarcodeFormats` promises to fail rather than quietly skip if `card.ts` is ever
    // refactored beyond regex reach. That promise is the whole reason deriving the list is
    // safe, so it needs exercising — hence `WEAR_BARCODE_SCHEMA_PATH`.
    const schemaPath = path.join(workDir, 'card.ts');
    fs.writeFileSync(schemaPath, 'export const somethingElse = 1;\n', 'utf8');

    const { status, output } = runExpectingFailure({
      env: { WEAR_BARCODE_SCHEMA_PATH: schemaPath }
    });

    expect(status).toBe(1);
    expect(output).toContain('Could not find `barcodeFormatSchema');
    expect(output).toContain('silently skipping defaultFormat validation is not an option');
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it('treats the schema as a real input, so widening it is drift', () => {
    // The formats reach the generated KDoc, so `card.ts` genuinely determines the output
    // and belongs in the input hash. Proving it here is what stops a future refactor from
    // "optimising" it back out and silently decoupling the doc from the schema.
    const schemaPath = path.join(workDir, 'card.ts');
    fs.writeFileSync(
      schemaPath,
      fs.readFileSync(BARCODE_SCHEMA, 'utf8').replace("'UPCA'", "'UPCA', 'DATAMATRIX'"),
      'utf8'
    );

    runGenerator();
    const before = generatedSource();

    runGenerator({ env: { WEAR_BARCODE_SCHEMA_PATH: schemaPath } });

    expect(generatedSource()).not.toBe(before);
    expect(generatedSource()).toContain('`DATAMATRIX`');
  });

  it('ignores a reordering of the schema, which is not a change to the set', () => {
    // Otherwise a phone-side contributor alphabetising an enum would be told to regenerate
    // a Wear OS file — a coupling with no reason to exist. The formats are sorted before
    // they reach either the KDoc or the hash.
    const schemaPath = path.join(workDir, 'card.ts');
    fs.writeFileSync(
      schemaPath,
      fs
        .readFileSync(BARCODE_SCHEMA, 'utf8')
        .replace(
          "z.enum(['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA'])",
          "z.enum(['UPCA', 'QR', 'EAN8', 'EAN13', 'CODE39', 'CODE128'])"
        ),
      'utf8'
    );

    runGenerator();
    const before = generatedSource();

    expect(runGenerator({ env: { WEAR_BARCODE_SCHEMA_PATH: schemaPath } })).toContain(
      'Inputs unchanged'
    );
    expect(generatedSource()).toBe(before);
  });

  it('ignores an edit to card.ts that leaves the enum alone', () => {
    // The extracted values go into the hash, not the file's bytes. `card.ts` also holds
    // the card schemas and is edited often; hashing it wholesale would invalidate the fast
    // path constantly for no benefit.
    const schemaPath = path.join(workDir, 'card.ts');
    fs.writeFileSync(
      schemaPath,
      `${fs.readFileSync(BARCODE_SCHEMA, 'utf8')}\nexport const unrelated = 42;\n`,
      'utf8'
    );

    runGenerator();

    expect(runGenerator({ env: { WEAR_BARCODE_SCHEMA_PATH: schemaPath } })).toContain(
      'Inputs unchanged'
    );
  });

  it('renders grammatical prose for a single-value schema', () => {
    // `slice(0, -1).join(', ') + ' or ' + last` yields a dangling "— or `X`" at length 1.
    // Vanishingly unlikely, but broken prose in a generated file is the kind of thing that
    // gets copied into the next generated file.
    const schemaPath = path.join(workDir, 'card.ts');
    fs.writeFileSync(
      schemaPath,
      fs
        .readFileSync(BARCODE_SCHEMA, 'utf8')
        .replace(
          "z.enum(['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA'])",
          "z.enum(['CODE128'])"
        ),
      'utf8'
    );
    const cataloguePath = writeFixture([brandFixture({ defaultFormat: 'CODE128' })]);

    runGenerator({
      env: { WEAR_BARCODE_SCHEMA_PATH: schemaPath, WEAR_CATALOGUE_JSON_PATH: cataloguePath }
    });

    expect(generatedSource()).toContain('known one —\n *   `CODE128` — otherwise null.');
    expect(generatedSource()).not.toMatch(/—\s*or\s/);
  });
});
