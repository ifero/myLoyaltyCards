/**
 * Build (or drift-check) the generated design-token TypeScript (Story 16.4).
 *
 *   node scripts/build-tokens.mjs          → regenerate shared/theme/tokens.generated.ts
 *   node scripts/build-tokens.mjs --check  → regenerate to a temp file and `git diff` it
 *                                            against the committed file (fails on drift)
 *
 * Mirrors the `check:catalogue-generated` pattern. The generated output is run
 * through the repo's Prettier config so the committed file matches a fresh
 * regeneration byte-for-byte (otherwise lint-staged's Prettier pass would make
 * the drift check flap with no real drift).
 */
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';
import StyleDictionary from 'style-dictionary';

import {
  makeConfig,
  OUTPUT_FILE,
  OUTPUT_FILENAME,
  SOURCE_FILES
} from '../style-dictionary.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PATH = join(ROOT, OUTPUT_FILE);

/**
 * Fail loudly on malformed DTCG: a leaf-shaped node (a non-`$` key whose value
 * is not a nested group object) must be authored as a `{ "$value": … }` token.
 * Guards against `$`-typos (e.g. `value:`/`50:` instead of `$value:`) that Style
 * Dictionary would otherwise silently drop from the generated output.
 */
const assertWellFormed = (node, path, file) => {
  const where = `${file} at "${path.join('.')}"`;
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error(
      `Malformed token in ${where}: expected a { "$value": … } object or a token group.`
    );
  }
  if ('$value' in node) return; // a token leaf — good
  for (const key of Object.keys(node)) {
    if (key.startsWith('$')) continue; // DTCG metadata ($type, $description, …)
    assertWellFormed(node[key], [...path, key], file);
  }
};

const validateSources = async () => {
  for (const file of SOURCE_FILES) {
    const raw = JSON.parse(await readFile(join(ROOT, file), 'utf8'));
    for (const groupName of Object.keys(raw)) {
      if (groupName.startsWith('$')) continue;
      assertWellFormed(raw[groupName], [groupName], file);
    }
  }
};

const generateFormatted = async () => {
  await validateSources();
  const tmpDir = await mkdtemp(join(tmpdir(), 'mlc-tokens-'));
  try {
    const sd = new StyleDictionary(makeConfig(tmpDir), { verbosity: 'silent' });
    await sd.buildAllPlatforms();
    const raw = await readFile(join(tmpDir, OUTPUT_FILENAME), 'utf8');
    const prettierConfig = await prettier.resolveConfig(OUTPUT_PATH);
    return prettier.format(raw, {
      ...prettierConfig,
      parser: 'typescript',
      filepath: OUTPUT_PATH
    });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

const run = async () => {
  const check = process.argv.includes('--check');
  const formatted = await generateFormatted();

  if (!check) {
    await writeFile(OUTPUT_PATH, formatted, 'utf8');
    console.log(`✓ Generated ${OUTPUT_FILE}`);
    return;
  }

  // --check: write the fresh output to a temp file and diff it against the
  // committed file, mirroring `git diff --exit-code`.
  const tmpDir = await mkdtemp(join(tmpdir(), 'mlc-tokens-check-'));
  const tmpFile = join(tmpDir, OUTPUT_FILENAME);
  try {
    await writeFile(tmpFile, formatted, 'utf8');
    const result = spawnSync(
      'git',
      ['--no-pager', 'diff', '--no-index', '--exit-code', '--', OUTPUT_PATH, tmpFile],
      { stdio: 'inherit' }
    );
    if (result.status !== 0) {
      console.error(
        `\n✗ ${OUTPUT_FILE} is out of sync with tokens/*.json. Run \`yarn tokens:build\` and commit the result.`
      );
      process.exit(1);
    }
    console.log(`✓ ${OUTPUT_FILE} is in sync with tokens/*.json`);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
