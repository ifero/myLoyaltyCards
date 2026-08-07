#!/usr/bin/env node
/**
 * Generate — or drift-check — the Wear OS brand catalogue as Kotlin source (Story 10.2).
 *
 *   node scripts/generate-wear-catalogue.mjs           → write watch-android/…/Generated/Brands.kt
 *   node scripts/generate-wear-catalogue.mjs --check   → regenerate in memory, fail on drift
 *
 * Exposed as `yarn wear:catalogue:generate` / `yarn wear:catalogue:check`; the latter is
 * wired into `.husky/pre-push` and `ci-quality-gates.yml` beside `tokens:check` and
 * `splash:check`. The watchOS mirror of this script is
 * `watch-ios/Scripts/generate-catalogue.swift`, and the emission logic here is a port of
 * it — read that one too before changing this.
 *
 * FOUR THINGS THAT LOOK LIKE MISTAKES AND ARE NOT
 *
 *  1. The generated Kotlin is COMMITTED. `docs/epics.md` Story 10.2 asks for it to be
 *     gitignored and for Gradle to run this generator before compiling. The project
 *     rejected that design for watchOS in Story 5-8 — its AC4 is literally "Keep
 *     generated file committed" — and settled on commit-the-artifact plus a drift check,
 *     which is also what `shared/theme/tokens.generated.ts` and `assets/splash-icon.png`
 *     do. A gitignored artifact cannot be drift-checked, so a stale catalogue would ship
 *     in silence.
 *
 *  2. This is Node, not the `generate-catalogue.kts` the epic names. Once the artifact is
 *     committed the Gradle build never runs the generator, which dissolves the "then
 *     Gradle would need Node" objection. Node matches the repo's two other generators and
 *     lets the drift check be a plain `yarn` script like its siblings.
 *
 *  3. `$` is escaped in the emitted string literals. Kotlin, unlike Swift, treats `$` as
 *     the string-template trigger, so an unescaped one in a brand name is a compile error
 *     at best and a silent substitution at worst. The catalogue has no `$` today; a
 *     future brand or alias could.
 *
 *  4. `--check` never reads the hash sidecar. A hash records the *inputs*; a hand-edit of
 *     the *output* leaves it untouched, so a hash-based check would call a corrupted
 *     artifact "in sync" — protection that reads as real and is not.
 *
 * Do not hand-edit the generated file. Change `catalogue/italy.json` (or this script) and
 * regenerate; the drift gate will catch you otherwise.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SCRIPT_PATH), '..');

const DEFAULT_CATALOGUE = 'catalogue/italy.json';
const DEFAULT_OUTPUT =
  'watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/Generated/Brands.kt';
/** Home of `barcodeFormatSchema`, the closed set `defaultFormat` must belong to. */
const DEFAULT_BARCODE_SCHEMA = 'core/schemas/card.ts';

/**
 * The Kotlin package is lowercase (`generated`) while the directory is `Generated/`.
 * That mismatch is deliberate on both sides: Kotlin package names are lowercase by
 * convention and the compiler does not require the directory to match, while the
 * directory name mirrors `targets/watch/Generated/` so the ignore-dir + un-ignore-file
 * `.gitignore` pair reads identically for both watch platforms.
 */
const KOTLIN_PACKAGE = 'com.iferoporefi.myloyaltycards.wear.generated';

/**
 * Env overrides carry a `WEAR_` prefix so they can neither be picked up by nor collide
 * with the watchOS generator's `CATALOGUE_JSON_PATH` / `CATALOGUE_OUTPUT_PATH`, which a
 * Jest run may have set in the same process environment. Same reasoning as
 * `WEAR_VERSION_CODE` vs the phone's `ANDROID_VERSION_CODE` in watch-android's Gradle.
 *
 * `WEAR_CATALOGUE_OUTPUT_PATH` in particular is what lets the test suite redirect
 * generation to a throwaway path so the tracked `Brands.kt` is never mutated.
 */
const resolveFromEnv = (name, fallback) => {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return join(ROOT, fallback);
  return isAbsolute(value) ? value : join(ROOT, value);
};

const CATALOGUE_PATH = resolveFromEnv('WEAR_CATALOGUE_JSON_PATH', DEFAULT_CATALOGUE);
const OUTPUT_PATH = resolveFromEnv('WEAR_CATALOGUE_OUTPUT_PATH', DEFAULT_OUTPUT);
/** Overridable for the same reason as the other two: so a test can point at a fixture. */
const BARCODE_SCHEMA_PATH = resolveFromEnv('WEAR_BARCODE_SCHEMA_PATH', DEFAULT_BARCODE_SCHEMA);

/**
 * Machine state, not an artifact — it records what the last run saw so an unchanged
 * catalogue does not rewrite the file. It sits next to the output (as the Swift
 * generator's does) so the single `Generated/*` ignore rule covers it for free.
 */
const HASH_PATH = join(dirname(OUTPUT_PATH), '.catalogue-inputs.sha256');

/**
 * Expresses `target` relative to the repo root with forward slashes, so the generated
 * `Source:` header is identical on every machine and every OS. Baking in an absolute
 * path is the difference between a drift check that passes on two checkouts and one that
 * does not. Falls back to the absolute path for anything outside the repo — a test
 * fixture in a temp dir, say — which is exactly when a relative path would be useless.
 */
const repoRelativePath = (target) => {
  const rel = relative(ROOT, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return target;
  return rel.split(sep).join('/');
};

/**
 * Kotlin's complete escape set is `\t \b \n \r \' \" \\ \$` plus `\uXXXX`. There is no
 * `\f`, no `\v` and no octal form, so every other control character has to go out as
 * `\uXXXX` rather than raw — a raw newline inside a `"…"` literal does not even compile.
 *
 * `$` is the entry with no Swift counterpart, and the reason this is not a transliteration
 * of `swiftStringLiteral`. `'` needs no escaping inside a double-quoted string and is
 * left alone on purpose: Italian brand names are full of apostrophes and escaping them
 * would be pure noise.
 */
const KOTLIN_ESCAPES = new Map([
  ['\\', '\\\\'],
  ['"', '\\"'],
  ['$', '\\$'],
  ['\n', '\\n'],
  ['\r', '\\r'],
  ['\t', '\\t'],
  ['\b', '\\b']
]);

/** Aborts the run; the top-level handler turns this into `✗ <message>` and exit 1. */
const fail = (message) => {
  throw new Error(message);
};

/** Renders `value` as a Kotlin double-quoted string literal, quotes included. */
const kotlinString = (value) => {
  let body = '';
  // Iterating with for…of walks code points, so an astral character (an emoji in a
  // brand name) survives as one unit instead of two broken halves.
  for (const char of value) {
    const escaped = KOTLIN_ESCAPES.get(char);
    if (escaped !== undefined) {
      body += escaped;
      continue;
    }
    const code = char.codePointAt(0);

    // A well-formed surrogate PAIR yields a code point above 0xFFFF here, so landing
    // inside the surrogate range means the input carried an UNPAIRED one. Writing it out
    // would silently become U+FFFD on UTF-8 encode — a corrupted brand name that still
    // compiles and still passes the drift check. Refuse instead. Only reachable from a
    // hand-authored `"\uD800"` in the JSON, which `JSON.parse` does permit.
    if (code >= 0xd800 && code <= 0xdfff) {
      fail(
        `Unpaired UTF-16 surrogate U+${code.toString(16).toUpperCase().padStart(4, '0')} in ` +
          `${JSON.stringify(value)}. Fix the catalogue entry; it cannot be encoded as UTF-8.`
      );
    }

    // C0 controls and DEL have no literal form; C1 (0x80–0x9F) are technically legal in
    // UTF-8 source but invisible, so they go out escaped too rather than as mojibake.
    const needsUnicodeEscape = code < 0x20 || (code >= 0x7f && code <= 0x9f);
    body += needsUnicodeEscape ? `\\u${code.toString(16).padStart(4, '0')}` : char;
  }
  return `"${body}"`;
};

/**
 * `emptyList()` for the empty case rather than `listOf()`: it is the idiomatic Kotlin
 * spelling and returns a shared singleton instead of allocating. Semantically it mirrors
 * `aliasesLiteral`'s `[]` on the Swift side — an absent or empty `aliases` becomes an
 * empty list, never null, so consumers never branch on it.
 */
const kotlinStringList = (values) =>
  values.length === 0 ? 'emptyList()' : `listOf(${values.map(kotlinString).join(', ')})`;

/** Mirrors `optionalLiteral` on the Swift side: absent becomes `null`, not `""`. */
const kotlinNullableString = (value) =>
  value === undefined || value === null ? 'null' : kotlinString(value);

/**
 * Mirrors `catalogueBrandSchema` in `catalogue/types.ts`, in its declaration order —
 * which is also the order the fields are emitted in, so the generated file reads like
 * the schema it came from.
 */
const REQUIRED_STRINGS = ['id', 'name', 'logo', 'color'];
const OPTIONAL_STRINGS = ['defaultFormat'];
const KNOWN_FIELDS = new Set([...REQUIRED_STRINGS, 'aliases', ...OPTIONAL_STRINGS]);

/**
 * The legal `defaultFormat` values, **derived** from `barcodeFormatSchema` rather than
 * transcribed here. `build-splash-icon.mjs` makes the same call for the same reason: a
 * hand-maintained parallel list goes stale silently, and here staleness would mean
 * *rejecting* a format the phone app had legally added. Fails loudly if the schema is ever
 * refactored out of regex reach, because quietly skipping the validation would be worse
 * than not having it at all.
 *
 * These values reach the generated KDoc as well as the validation, so they are a real
 * input. (An earlier revision derived only the validation and left the KDoc hand-typed —
 * which recreated, in the documentation, exactly the staleness this function prevents.)
 *
 * Returned SORTED, which is what keeps `card.ts` and `watch-android/` decoupled: the set
 * of legal formats is what matters, not the order someone happened to write them in, and a
 * phone-side contributor alphabetising an enum has no reason to expect that to require
 * regenerating a Wear OS file.
 */
const readBarcodeFormats = () => {
  const label = repoRelativePath(BARCODE_SCHEMA_PATH);
  const source = readFileSync(BARCODE_SCHEMA_PATH, 'utf8');
  const enumBody = source.match(/barcodeFormatSchema\s*=\s*z\.enum\(\[([^\]]*)\]\)/)?.[1];
  if (enumBody === undefined) {
    fail(
      `Could not find \`barcodeFormatSchema = z.enum([…])\` in ${label}.\n` +
        'Update readBarcodeFormats() in scripts/generate-wear-catalogue.mjs to match its\n' +
        'new shape — silently skipping defaultFormat validation is not an option.'
    );
  }
  const formats = [...enumBody.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  if (formats.length === 0) fail(`\`barcodeFormatSchema\` in ${label} lists no values.`);
  return formats.sort();
};

/**
 * Validates one brand and — the part that matters — fails on any field this generator
 * does not know about. Both sibling generators guard their inputs the same way
 * (`assertWellFormed` in `build-tokens.mjs`, `assertSvgMatches` in
 * `build-splash-icon.mjs`), because a generator that quietly ignores new input is
 * precisely how a catalogue field ends up present on the phone and missing on the watch.
 */
const validateBrand = (brand, index, barcodeFormats) => {
  const where = `${repoRelativePath(CATALOGUE_PATH)} brands[${index}]`;

  if (brand === null || typeof brand !== 'object' || Array.isArray(brand)) {
    fail(`${where} is not an object.`);
  }

  for (const field of REQUIRED_STRINGS) {
    if (typeof brand[field] !== 'string' || brand[field] === '') {
      fail(`${where} is missing a non-empty string "${field}".`);
    }
  }

  for (const field of OPTIONAL_STRINGS) {
    const value = brand[field];
    if (value !== undefined && typeof value !== 'string') {
      fail(`${where} has a non-string "${field}".`);
    }
  }

  // `defaultFormat` is a closed set on the phone side, and `Brands.kt`'s KDoc enumerates
  // it. Without this the generator would happily bake a typo'd format into the APK and
  // leave Story 10-4 to discover it at render time.
  if (brand.defaultFormat !== undefined && !barcodeFormats.includes(brand.defaultFormat)) {
    fail(
      `${where} has defaultFormat ${JSON.stringify(brand.defaultFormat)}, which is not one of ` +
        `${barcodeFormats.join(', ')} (per \`barcodeFormatSchema\` in ${repoRelativePath(BARCODE_SCHEMA_PATH)}).`
    );
  }

  if (!Array.isArray(brand.aliases) || brand.aliases.some((a) => typeof a !== 'string')) {
    fail(`${where} must have an "aliases" array of strings (use [] when there are none).`);
  }

  for (const key of Object.keys(brand)) {
    if (KNOWN_FIELDS.has(key)) continue;
    fail(
      `${where} has field "${key}", which this generator does not emit.\n` +
        `Add it to scripts/generate-wear-catalogue.mjs (REQUIRED_STRINGS / OPTIONAL_STRINGS\n` +
        `and the WearBrand data class) so the Wear OS catalogue keeps full field parity\n` +
        `with catalogue/types.ts, then regenerate.`
    );
  }
};

const loadCatalogue = () => {
  const label = repoRelativePath(CATALOGUE_PATH);
  if (!existsSync(CATALOGUE_PATH)) fail(`Catalogue not found at ${label}.`);

  // Name the file. Node's bare `SyntaxError: Unexpected token …` says nothing about
  // *which* file it failed to parse, and every other failure path here is actionable.
  let catalogue;
  try {
    catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalogue.version ?? '')) {
    fail(
      `${label} needs a "version" ISO date (YYYY-MM-DD); got ${JSON.stringify(catalogue.version)}.`
    );
  }
  if (!Array.isArray(catalogue.brands) || catalogue.brands.length === 0) {
    fail(`${label} needs a non-empty "brands" array.`);
  }

  const barcodeFormats = readBarcodeFormats();
  catalogue.brands.forEach((brand, index) => validateBrand(brand, index, barcodeFormats));
  catalogue.barcodeFormats = barcodeFormats;

  const ids = catalogue.brands.map((brand) => brand.id);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length > 0) {
    // Sorting by a duplicated key leaves the relative order of the tied entries up to
    // the input, which would make the output — and therefore the drift check — depend on
    // how the JSON happened to be written.
    fail(`${label} has duplicate brand ids: ${duplicates.join(', ')}.`);
  }

  return catalogue;
};

/**
 * Sorted by code unit, NOT with `localeCompare`: collation is locale-dependent, so a
 * machine with a different ICU locale would emit a different order and every drift check
 * on that machine would fail. Deterministic order is the whole basis of the gate.
 */
const sortById = (brands) => [...brands].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const brandLiteral = (brand) =>
  '        WearBrand(' +
  [
    `id = ${kotlinString(brand.id)}`,
    `name = ${kotlinString(brand.name)}`,
    `aliases = ${kotlinStringList(brand.aliases)}`,
    `logo = ${kotlinString(brand.logo)}`,
    `color = ${kotlinString(brand.color)}`,
    `defaultFormat = ${kotlinNullableString(brand.defaultFormat)}`
  ].join(', ') +
  ')';

/**
 * One line per brand with named arguments, mirroring `Brands.swift`. The lines are long,
 * and that is the trade: a catalogue edit then shows up as one changed line per changed
 * brand, which is what makes reviewing a catalogue PR a glance rather than a scroll.
 */
const renderKotlin = (catalogue) => {
  const cataloguePath = repoRelativePath(CATALOGUE_PATH);
  const entries = sortById(catalogue.brands).map(brandLiteral).join(',\n');

  // Derived, not typed out. Emitting a hand-written copy of this list would put the very
  // staleness `readBarcodeFormats` exists to prevent straight back into the KDoc, one
  // layer down and harder to notice. Because the list reaches the OUTPUT, a schema change
  // becomes real drift that `--check` fails on — that is what closes the gap, not the
  // input hash, which `--check` never consults.
  //
  // The 1- and 2-element cases are handled explicitly because the obvious
  // `slice(0, -1).join(', ') + ' or ' + last` renders a dangling "or `X`" for a
  // single-value enum. Vanishingly unlikely, but broken prose in a generated file is the
  // kind of thing that gets copied.
  const quoted = catalogue.barcodeFormats.map((format) => `\`${format}\``);
  const formatList =
    quoted.length === 1 ? quoted[0] : `${quoted.slice(0, -1).join(', ')} or ${quoted.at(-1)}`;

  return `// DO NOT EDIT — This file is auto-generated.
// Generated by ${repoRelativePath(SCRIPT_PATH)}
// Source: ${cataloguePath}
//
// Regenerate with \`yarn wear:catalogue:generate\`. \`yarn wear:catalogue:check\` runs in
// pre-push and in CI and fails when this file drifts from the catalogue, so hand-editing
// it is pointless — change ${cataloguePath} (or the generator) instead.

package ${KOTLIN_PACKAGE}

/**
 * One brand from the shared catalogue at \`${cataloguePath}\`, compiled into the APK as
 * Kotlin source.
 *
 * Generating this is what removes the runtime failure mode: the watch does no JSON
 * parsing, no file I/O and no reflection to read brand data, so if the APK built, the
 * catalogue is there. Every field is a \`val\` of an immutable type, which also makes
 * instances safe to share across threads with no ceremony — the Kotlin equivalent of
 * \`WatchBrand: Sendable\` on watchOS.
 *
 * Fields mirror \`catalogue/types.ts\` exactly, in its declaration order.
 *
 * @property id Stable slug, e.g. \`"esselunga"\`. Unique across the catalogue.
 * @property name Display name.
 * @property aliases Alternative names for search; empty, never null.
 * @property logo Asset key for logo mapping. Generated for field parity with the phone
 *   and watchOS catalogues; the Wear card list draws initials on a brand-coloured
 *   circle, so nothing consumes this yet.
 * @property color Brand primary colour as a \`#RRGGBB\` (or \`#RGB\`) hex string.
 * @property defaultFormat Default barcode format when the brand has a known one —
 *   ${formatList} — otherwise null. Kept a
 *   \`String?\` rather than an enum so the type matches the catalogue exactly.
 */
data class WearBrand(
    val id: String,
    val name: String,
    val aliases: List<String>,
    val logo: String,
    val color: String,
    val defaultFormat: String?,
)

/** The compiled-in brand catalogue. */
object WearBrands {
    /**
     * ISO date (\`YYYY-MM-DD\`) of the catalogue release this file was generated from.
     *
     * The watch catalogue is compiled in, so it changes only with a new APK — it does
     * **not** receive the over-the-air catalogue updates the phone gets (Story 3-5). This
     * value is what makes that asymmetry diagnosable when sync misbehaves.
     */
    const val VERSION: String = ${kotlinString(catalogue.version)}

    /** Every catalogue brand, ordered by [WearBrand.id]. */
    val ALL: List<WearBrand> = listOf(
${entries},
    )
}
`;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Digest of everything that determines the output: the catalogue bytes and this script's
 * own bytes, each tagged with its repo-relative path so a rename registers as a change,
 * plus the barcode formats (which reach the KDoc). Repo-relative rather than absolute so
 * the sidecar stays valid if the checkout moves.
 *
 * The formats go in as the extracted, sorted VALUES rather than as `card.ts`'s bytes.
 * Hashing the whole file would make any unrelated edit to it — it also holds the card
 * schemas, and is edited often — invalidate the fast path and trigger a redundant,
 * byte-identical rewrite. Harmless, but pointless; the enum is the only part that matters.
 *
 * This affects `generate` only. `--check` never consults the sidecar (see the header), so
 * none of this is what makes drift detectable.
 */
const computeInputHash = (barcodeFormats) => {
  const hash = createHash('sha256');
  hash.update(barcodeFormats.join(','));
  for (const path of [CATALOGUE_PATH, SCRIPT_PATH]) {
    hash.update(repoRelativePath(path));
    hash.update(readFileSync(path));
  }
  return hash.digest('hex');
};

const readSidecar = () => {
  if (!existsSync(HASH_PATH)) return null;
  const entries = readFileSync(HASH_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim().split('='))
    .filter((parts) => parts.length === 2);
  return Object.fromEntries(entries);
};

const runCheck = (source) => {
  const outputLabel = repoRelativePath(OUTPUT_PATH);
  const cataloguePath = repoRelativePath(CATALOGUE_PATH);

  // A missing artifact is a distinct failure from a stale one, and worth its own wording:
  // the fix is the same command but the cause is completely different (never generated /
  // deleted / lost to a bad `.gitignore` rule, rather than an un-regenerated edit).
  if (!existsSync(OUTPUT_PATH)) {
    console.error(
      `✗ Committed ${outputLabel} is missing.\n` +
        '  Run `yarn wear:catalogue:generate` to create it, then commit the result.'
    );
    process.exit(1);
  }

  if (readFileSync(OUTPUT_PATH, 'utf8') === source) {
    console.log(`✓ ${outputLabel} is in sync with ${cataloguePath}`);
    return;
  }

  console.error(
    `✗ ${outputLabel} is out of sync with ${cataloguePath}.\n` +
      '  Run `yarn wear:catalogue:generate` and commit the result.'
  );
  process.exit(1);
};

const run = () => {
  const catalogue = loadCatalogue();
  const source = renderKotlin(catalogue);

  if (process.argv.includes('--check')) {
    runCheck(source);
    return;
  }

  const outputLabel = repoRelativePath(OUTPUT_PATH);
  const inputHash = computeInputHash(catalogue.barcodeFormats);
  const sidecar = readSidecar();

  // The output digest is in the skip decision as well as the input digest, which the
  // Swift generator does not do. Without it, a hand-edited `Brands.kt` deadlocks the
  // developer: the inputs still hash the same, so `generate` skips and leaves the edit in
  // place, while `--check` keeps failing and telling them to run `generate`. Including it
  // means a hand edit simply gets overwritten, which is what the drift gate's advice
  // ("fix the generator, not the file") assumes happens.
  const upToDate =
    sidecar?.inputs === inputHash &&
    existsSync(OUTPUT_PATH) &&
    sidecar?.output === sha256(readFileSync(OUTPUT_PATH));

  if (upToDate) {
    console.log(`✓ Inputs unchanged; ${outputLabel} left untouched`);
    return;
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, source, 'utf8');
  writeFileSync(HASH_PATH, `inputs=${inputHash}\noutput=${sha256(source)}\n`, 'utf8');
  console.log(`✓ Generated ${outputLabel}`);
};

try {
  run();
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
