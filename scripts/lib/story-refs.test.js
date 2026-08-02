/**
 * @jest-environment node
 */
// Unit tests for resolveStorySlugs() — in particular the numeric fallback that
// scripts/mark-story-done.mjs uses to decide which story a merged PR completes.
//
// WHY A SUBPROCESS: story-refs.mjs is a plain Node ESM module that reads
// `import.meta.url`. Jest compiles through babel.config.test.js, which targets
// Hermes/React Native and emits CommonJS — where `import.meta` is a hard syntax
// error ("Enable the polyfill unstable_transformImportMeta"). Turning that
// polyfill on would change the transform for every app test just to reach a build
// script, so instead each case is evaluated in one real `node --input-type=module`
// child. That also runs the module under exactly the ESM semantics CI uses, with
// no transform in between. All cases share a single spawn, resolved in beforeAll.
//
// WHY THESE FIXTURES: resolveStorySlugs only returns slugs whose file exists, so a
// negative case is vacuous unless a matching file is present. Every decoy below is
// paired with a fixture the OLD regex did resolve — remove the fix and these fail.

const { execFileSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./story-refs.mjs')).href;

const FIXTURE_STORIES = [
  '1-2-extend-semantic-error-colors.md', // matched by "v1.2.3"
  '5-9-edit-card.md', // the legitimate "(Story 5.9)" target
  '13-7-restyle-onboarding.md', // matched by "13.7%"
  '13-7a-import-data-from-json.md', // letter-suffixed story id
  '16-24-clear-exhaustive-deps.md', // matched by a bare "16-24"
  '2026-07-decoy.md' // matched by the ISO date "2026-07-28"
];

// [name, input text, options] — evaluated in order by the child process.
const CASES = [
  ['version strings', 'Bumped the toolchain to v1.2.3 and pinned expo to 13.7.0.', {}],
  ['iso dates', 'Regenerated on 2026-07-28 after the 2026-07-28 incident.', {}],
  ['bare numeric in prose', 'Rebased onto 16-24 files changed; coverage moved 13.7% to 13.9%.', {}],
  ['story-prefixed version', 'See the story 1.2.3 release notes for details.', {}],
  ['backstory substring', 'The backstory 5.9 explains why this exists.', {}],
  ['story suffix title', 'fix(watch): render the complication (Story 5.9)', {}],
  ['story dashed ref', 'Implements Story 13-7a end to end.', {}],
  [
    'explicit story path',
    'Implements docs/sprint-artifacts/stories/16-24-clear-exhaustive-deps.md',
    {}
  ],
  [
    'path suppresses fallback',
    'Fixes the v1.2.3 regression — spec: docs/sprint-artifacts/stories/16-24-clear-exhaustive-deps.md',
    {}
  ],
  ['exact slug', '5-9-edit-card', {}],
  ['bare numeric without opt-in', '16-24', {}],
  ['bare numeric with opt-in', '16-24', { allowBareNumeric: true }],
  ['quoted cli reference with opt-in', 'Story 5.9', { allowBareNumeric: true }],
  ['empty input', '', {}]
];

// Evaluate every case in one child process and return a name -> slugs[] map.
const runCases = (dir) => {
  const harness = `
    import { resolveStorySlugs } from ${JSON.stringify(MODULE_URL)};
    const dir = process.env.FIXTURE_DIR;
    const cases = JSON.parse(process.env.CASES_JSON);
    process.stdout.write(
      JSON.stringify(cases.map(([, text, opts]) => resolveStorySlugs(text, dir, opts)))
    );
  `;

  let stdout;
  try {
    stdout = execFileSync(process.execPath, ['--input-type=module', '-e', harness], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FIXTURE_DIR: dir, CASES_JSON: JSON.stringify(CASES) }
    });
  } catch (err) {
    throw new Error(`story-refs harness failed:\n${err.stderr || err.message}`);
  }

  const results = JSON.parse(stdout);
  return Object.fromEntries(CASES.map(([name], i) => [name, results[i]]));
};

describe('resolveStorySlugs', () => {
  let dir;
  let resolved;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'story-refs-'));
    for (const file of FIXTURE_STORIES) {
      writeFileSync(join(dir, file), '**Status:** review\n');
    }
    resolved = runCases(dir);
  });

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  describe('the numeric fallback ignores incidental numbers in PR prose', () => {
    it('does not treat a version string as a story reference', () => {
      expect(resolved['version strings']).toEqual([]);
    });

    it('does not treat an ISO date as a story reference', () => {
      expect(resolved['iso dates']).toEqual([]);
    });

    it('does not treat a bare N-M / N.M token as a story reference', () => {
      expect(resolved['bare numeric in prose']).toEqual([]);
    });

    it('does not read a three-segment version following the word "story"', () => {
      expect(resolved['story-prefixed version']).toEqual([]);
    });

    it('does not match "story" as a substring of another word', () => {
      expect(resolved['backstory substring']).toEqual([]);
    });
  });

  describe('legitimate references still resolve', () => {
    it('resolves a title ending in "(Story X.Y)"', () => {
      expect(resolved['story suffix title']).toEqual(['5-9-edit-card']);
    });

    it('resolves a dashed, letter-suffixed "Story 13-7a"', () => {
      expect(resolved['story dashed ref']).toEqual(['13-7a-import-data-from-json']);
    });

    it('resolves an explicit stories/<slug>.md path', () => {
      expect(resolved['explicit story path']).toEqual(['16-24-clear-exhaustive-deps']);
    });

    it('resolves an exact slug', () => {
      expect(resolved['exact slug']).toEqual(['5-9-edit-card']);
    });

    it('lets an explicit path suppress the fallback entirely', () => {
      expect(resolved['path suppresses fallback']).toEqual(['16-24-clear-exhaustive-deps']);
    });

    it('resolves nothing for empty input', () => {
      expect(resolved['empty input']).toEqual([]);
    });
  });

  describe('allowBareNumeric gates the keyword-less form', () => {
    // The contrast pair: identical input, opposite outcome. Bare "16-24" is a
    // deliberate CLI arg (`node scripts/mark-story-done.mjs 16-24`, documented in
    // CONTRIBUTING.md) but must never resolve out of PR title/body prose.
    it('rejects a bare "16-24" by default', () => {
      expect(resolved['bare numeric without opt-in']).toEqual([]);
    });

    it('accepts a bare "16-24" when opted in', () => {
      expect(resolved['bare numeric with opt-in']).toEqual(['16-24-clear-exhaustive-deps']);
    });

    it('still accepts the "Story X.Y" form when opted in', () => {
      expect(resolved['quoted cli reference with opt-in']).toEqual(['5-9-edit-card']);
    });
  });
});
