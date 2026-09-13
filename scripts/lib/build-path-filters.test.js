/**
 * @jest-environment node
 */
// Unit tests for the binary-affecting path-filter primitives behind
// `yarn check:build-path-filters` and the nightly build gate (Story 16.36).
//
// WHY A SUBPROCESS: build-path-filters.mjs is a plain Node ESM module in scripts/, and Jest
// compiles through babel.config.test.js, which targets Hermes/React Native and emits CommonJS;
// `moduleFileExtensions` also omits `mjs`. Rather than change the transform for every app test
// to reach a build script, every case is evaluated in one real `node --input-type=module`
// child — the same approach story-catalogue.test.js, story-refs.test.js and
// signing-fingerprints.test.js take, and the same ESM semantics CI runs.
//
// WHY THIS FILE EARNS ITS KEEP: these functions decide, unattended at 03:00, whether a nightly
// build happens at all. A false negative is not a red X — it is a silence nobody notices, which
// is precisely the failure shape Story 16.35 was written about. The order-sensitivity cases are
// the ones that actually matter: GitHub resolves `paths` by LAST match per file, and getting
// that backwards would make every commit that touches a test file skip the build.
//
// Assertions are on problem `code`s, never prose, so messages stay editable.

const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./build-path-filters.mjs')).href;

// A minimal config, independent of the committed one, so these cases pin the RULES.
const CONFIG = {
  excludes: ['!**/*.test.ts'],
  ios: { paths: ['app/**', 'ios/**'] },
  android: { paths: ['app/**', 'android/**'], nightlyExtra: ['watch-android/**'] },
  nightly: { paths: ['.github/workflows/nightly-builds.yml'] }
};

// A workflow with every shape the scanner has to survive: a comment inside the block, a blank
// line, single and double quotes, a bare scalar, and a DECOY `paths:` key further down that a
// run-on scanner would swallow.
const WORKFLOW_YAML = [
  'name: Example',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '    paths:',
  '      # A comment inside the block must be skipped, not parsed.',
  "      - 'app/**'",
  '',
  '      - "ios/**"',
  '      - app.json',
  "      - '!**/*.test.ts'",
  '  workflow_dispatch:',
  '',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    paths:',
  "      - 'decoy/**'"
].join('\n');

const NO_PATHS_YAML = 'on:\n  push:\n    branches: [main]\n';

// A quoted item that ALSO carries a trailing comment: matching `^'(.*)'$` first fails the
// anchor here, so a naive implementation strips the comment and keeps the orphaned quotes.
const QUOTED_COMMENT_YAML = [
  'on:',
  '  push:',
  '    paths:',
  "      - 'app/**' # why this one is here",
  '      - "ios/**" # and this one'
].join('\n');

// `watchos-tests.yml` and `wear-os-build.yml` both put `pull_request.paths` BEFORE `push.paths`.
// Taking "the first `paths:`" would silently compare the wrong list.
const PR_FIRST_YAML = [
  'on:',
  '  pull_request:',
  '    paths:',
  "      - 'decoy/**'",
  '  push:',
  '    branches: [main]',
  '    paths:',
  "      - 'app/**'",
  "      - '!**/*.test.ts'"
].join('\n');

// A workflow with paths under pull_request ONLY must throw, not silently adopt them.
const PR_ONLY_YAML = ['on:', '  pull_request:', '    paths:', "      - 'decoy/**'"].join('\n');

// [name, fnName, args] — evaluated in order, in one child. A thrown error is captured as
// { error: message } so the "fails loudly" cases can be asserted like any other.
const CASES = [
  // --- matchesGlob: a directory glob must not prefix-match a sibling ---
  ['glob dir: file inside', 'matchesGlob', ['app/index.tsx', 'app/**']],
  ['glob dir: nested file inside', 'matchesGlob', ['app/(tabs)/cards/index.tsx', 'app/**']],
  ['glob dir: sibling directory', 'matchesGlob', ['apple/index.tsx', 'app/**']],
  ['glob dir: nested elsewhere', 'matchesGlob', ['docs/app/index.tsx', 'app/**']],

  // --- matchesGlob: leading **/ matches zero directories ---
  ['glob **/: top level', 'matchesGlob', ['setup.test.ts', '**/*.test.ts']],
  ['glob **/: one level', 'matchesGlob', ['core/cards.test.ts', '**/*.test.ts']],
  ['glob **/: deep', 'matchesGlob', ['features/cards/ui/tile.test.ts', '**/*.test.ts']],
  ['glob **/: wrong extension', 'matchesGlob', ['core/cards.test.tsx', '**/*.test.ts']],

  // --- matchesGlob: * stays inside one segment ---
  ['glob *: same segment', 'matchesGlob', ['catalogue/italy.json', 'catalogue/*.json']],
  ['glob *: does not cross /', 'matchesGlob', ['catalogue/a/italy.json', 'catalogue/*.json']],

  // --- matchesGlob: regex metacharacters are literals ---
  ['glob literal dot: exact', 'matchesGlob', ['app.json', 'app.json']],
  ['glob literal dot: not any-char', 'matchesGlob', ['appXjson', 'app.json']],
  [
    'glob literal path: exact',
    'matchesGlob',
    ['.github/workflows/ios-release.yml', '.github/workflows/ios-release.yml']
  ],
  [
    'glob literal path: suffixed',
    'matchesGlob',
    ['.github/workflows/ios-release.yml.bak', '.github/workflows/ios-release.yml']
  ],
  [
    'glob literal path: prefixed',
    'matchesGlob',
    ['x/.github/workflows/ios-release.yml', '.github/workflows/ios-release.yml']
  ],

  // --- fileIsIncluded: GitHub semantics, LAST match wins ---
  [
    'include: positive match',
    'fileIsIncluded',
    ['core/cards.ts', ['app/**', 'core/**', '!**/*.test.ts']]
  ],
  [
    'include: excluded by later negative',
    'fileIsIncluded',
    ['core/cards.test.ts', ['core/**', '!**/*.test.ts']]
  ],
  ['include: unmatched file', 'fileIsIncluded', ['docs/cicd.md', ['app/**', 'core/**']]],
  // Order is load-bearing: a negative BEFORE its positive does not exclude.
  [
    'include: negative before positive',
    'fileIsIncluded',
    ['core/cards.test.ts', ['!**/*.test.ts', 'core/**']]
  ],
  [
    'include: negative after positive',
    'fileIsIncluded',
    ['core/cards.test.ts', ['core/**', '!**/*.test.ts']]
  ],

  // --- selectTriggeringFiles ---
  [
    'select: real source only',
    'selectTriggeringFiles',
    [
      ['core/cards.ts', 'docs/x.md'],
      ['core/**', '!**/*.test.ts']
    ]
  ],
  // The documented case: an excluded file ALONGSIDE real source must still build.
  [
    'select: test plus source',
    'selectTriggeringFiles',
    [
      ['core/cards.ts', 'core/cards.test.ts'],
      ['core/**', '!**/*.test.ts']
    ]
  ],
  [
    'select: test only',
    'selectTriggeringFiles',
    [['core/cards.test.ts'], ['core/**', '!**/*.test.ts']]
  ],
  // mark-story-done.yml pushes exactly this after nearly every merge — the nightly common case.
  [
    'select: docs only',
    'selectTriggeringFiles',
    [
      ['docs/sprint-artifacts/sprint-status.yaml', 'docs/sprint-artifacts/stories/16-36-x.md'],
      ['core/**', 'app/**', '!**/*.test.ts']
    ]
  ],
  ['select: empty change set', 'selectTriggeringFiles', [[], ['core/**']]],
  // AC4's regression case: a wear-data-layer change must trigger, on both platforms.
  [
    'select: modules change',
    'selectTriggeringFiles',
    [['modules/wear-data-layer/src/x.ts'], ['modules/**', '!**/*.test.ts']]
  ],

  // --- extractWorkflowPaths ---
  ['extract: in order', 'extractWorkflowPaths', [WORKFLOW_YAML]],
  ['extract: no paths block', 'extractWorkflowPaths', [NO_PATHS_YAML]],

  // --- extractWorkflowPaths: the review findings, each with its own case ---
  ['extract: CRLF line endings', 'extractWorkflowPaths', [WORKFLOW_YAML.replace(/\n/g, '\r\n')]],
  ['extract: quoted item with a trailing comment', 'extractWorkflowPaths', [QUOTED_COMMENT_YAML]],
  ['extract: pull_request paths BEFORE push paths', 'extractWorkflowPaths', [PR_FIRST_YAML]],
  ['extract: only pull_request has paths', 'extractWorkflowPaths', [PR_ONLY_YAML]],

  // --- loadFilterConfig: malformed input must name the broken section ---
  [
    'config: missing section',
    'loadFilterConfig',
    ['{"ios":{"paths":[]},"nightly":{"paths":[]},"excludes":{"paths":[]}}']
  ],
  [
    'config: section without paths',
    'loadFilterConfig',
    [
      '{"ios":{"paths":[]},"android":{"paths":[],"nightlyExtra":{"paths":[]}},"nightly":{"paths":[]},"excludes":{}}'
    ]
  ],
  [
    'config: non-string entry',
    'loadFilterConfig',
    [
      '{"ios":{"paths":[1]},"android":{"paths":[],"nightlyExtra":{"paths":[]}},"nightly":{"paths":[]},"excludes":{"paths":[]}}'
    ]
  ],

  // --- resolveFilterSet ---
  [
    'resolve: ios release',
    'resolveFilterSet',
    [CONFIG, 'ios', { selfPath: '.github/workflows/ios-release.yml' }]
  ],
  ['resolve: ios nightly', 'resolveFilterSet', [CONFIG, 'ios', { nightly: true }]],
  [
    'resolve: android release',
    'resolveFilterSet',
    [CONFIG, 'android', { selfPath: '.github/workflows/android-release.yml' }]
  ],
  ['resolve: android nightly', 'resolveFilterSet', [CONFIG, 'android', { nightly: true }]],
  ['resolve: unknown platform', 'resolveFilterSet', [CONFIG, 'web', { nightly: true }]],

  // --- decideBuild: the three reasons a nightly builds, and the one it skips ---
  [
    'decide: changed',
    'decideBuild',
    [{ files: ['core/cards.ts'], patterns: ['core/**', '!**/*.test.ts'] }]
  ],
  [
    'decide: unchanged',
    'decideBuild',
    [{ files: ['docs/x.md'], patterns: ['core/**', '!**/*.test.ts'] }]
  ],
  [
    'decide: forced beats unchanged',
    'decideBuild',
    [{ files: ['docs/x.md'], patterns: ['core/**'], force: true }]
  ],
  [
    'decide: missing baseline fails OPEN',
    'decideBuild',
    [{ files: [], patterns: ['core/**'], baselineMissing: true }]
  ],
  [
    'decide: force wins over a missing baseline too',
    'decideBuild',
    [{ files: [], patterns: ['core/**'], force: true, baselineMissing: true }]
  ],

  // --- loadFilterConfig: the real committed config ---
  ['config: real', 'loadFilterConfig', []]
];

/** Evaluate every case in one child process; return name -> value (or {error}). */
const runCases = () => {
  const harness = `
    import * as mod from ${JSON.stringify(MODULE_URL)};
    const cases = JSON.parse(process.env.CASES_JSON);
    process.stdout.write(
      JSON.stringify(
        cases.map(([, fnName, args]) => {
          try {
            return { value: mod[fnName](...args) };
          } catch (err) {
            return { error: String(err && err.message ? err.message : err) };
          }
        })
      )
    );
  `;

  let stdout;
  try {
    stdout = execFileSync(process.execPath, ['--input-type=module', '-e', harness], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CASES_JSON: JSON.stringify(CASES) }
    });
  } catch (err) {
    throw new Error(`build-path-filters harness failed:\n${err.stderr || err.message}`);
  }

  const results = JSON.parse(stdout);
  return Object.fromEntries(CASES.map(([name], i) => [name, results[i]]));
};

describe('build-path-filters', () => {
  let r;

  beforeAll(() => {
    r = runCases();
  });

  const value = (name) => {
    if (r[name].error) throw new Error(`case "${name}" threw: ${r[name].error}`);
    return r[name].value;
  };
  const error = (name) => r[name].error;

  describe('matchesGlob', () => {
    it('anchors a directory glob to the whole first segment', () => {
      expect(value('glob dir: file inside')).toBe(true);
      expect(value('glob dir: nested file inside')).toBe(true);
      // A prefix match would fire for an unrelated sibling directory.
      expect(value('glob dir: sibling directory')).toBe(false);
      expect(value('glob dir: nested elsewhere')).toBe(false);
    });

    it('lets a leading **/ match zero directories', () => {
      expect(value('glob **/: top level')).toBe(true);
      expect(value('glob **/: one level')).toBe(true);
      expect(value('glob **/: deep')).toBe(true);
      expect(value('glob **/: wrong extension')).toBe(false);
    });

    it('keeps * inside a single segment', () => {
      expect(value('glob *: same segment')).toBe(true);
      expect(value('glob *: does not cross /')).toBe(false);
    });

    it('treats regex metacharacters as literals', () => {
      expect(value('glob literal dot: exact')).toBe(true);
      // `appXjson` matches if the dot is left as a regex metacharacter.
      expect(value('glob literal dot: not any-char')).toBe(false);
    });

    it('matches a literal path exactly, with nothing around it', () => {
      expect(value('glob literal path: exact')).toBe(true);
      expect(value('glob literal path: suffixed')).toBe(false);
      expect(value('glob literal path: prefixed')).toBe(false);
    });
  });

  describe('fileIsIncluded', () => {
    it('includes a file matching a positive pattern', () => {
      expect(value('include: positive match')).toBe(true);
    });

    it('excludes a file whose last matching pattern is negative', () => {
      expect(value('include: excluded by later negative')).toBe(false);
    });

    it('ignores a file no pattern matches', () => {
      expect(value('include: unmatched file')).toBe(false);
    });

    it('is order-sensitive, because GitHub is: the LAST match wins', () => {
      // This pair is the whole reason the workflow comments say "order is load-bearing".
      // Swap the implementation to first-match-wins and only these two go red.
      expect(value('include: negative before positive')).toBe(true);
      expect(value('include: negative after positive')).toBe(false);
    });
  });

  describe('selectTriggeringFiles', () => {
    it('returns only the files that justify a build', () => {
      expect(value('select: real source only')).toEqual(['core/cards.ts']);
    });

    it('builds when a commit touches BOTH a test and real source', () => {
      expect(value('select: test plus source')).toEqual(['core/cards.ts']);
    });

    it('skips a test-only change', () => {
      expect(value('select: test only')).toEqual([]);
    });

    it('skips a docs-only change — the nightly common case', () => {
      expect(value('select: docs only')).toEqual([]);
    });

    it('returns [] for an empty change set rather than throwing', () => {
      expect(value('select: empty change set')).toEqual([]);
    });

    it('triggers on a modules/ change (AC4 regression)', () => {
      expect(value('select: modules change')).toEqual(['modules/wear-data-layer/src/x.ts']);
    });
  });

  describe('extractWorkflowPaths', () => {
    it('reads the first on.push.paths block in order, ignoring comments and blanks', () => {
      expect(value('extract: in order')).toEqual(['app/**', 'ios/**', 'app.json', '!**/*.test.ts']);
    });

    it('stops at the next key at or above the block indentation', () => {
      // A run-on scanner would swallow `decoy/**` from the jobs section.
      expect(value('extract: in order')).not.toContain('decoy/**');
    });

    it('survives CRLF line endings', () => {
      // `.` does not match `\r` and `$` without /m anchors to end-of-string, so a CRLF file
      // used to make every item regex fail and return a silent [] — the one outcome this
      // function's contract forbids.
      expect(value('extract: CRLF line endings')).toEqual([
        'app/**',
        'ios/**',
        'app.json',
        '!**/*.test.ts'
      ]);
    });

    it('strips quotes from an item that also has a trailing comment', () => {
      expect(value('extract: quoted item with a trailing comment')).toEqual(['app/**', 'ios/**']);
    });

    it('reads push.paths even when pull_request.paths comes first', () => {
      // Taking the first `paths:` in the file is correct only by luck in the two guarded
      // workflows; it breaks the moment one gains a pull_request trigger.
      expect(value('extract: pull_request paths BEFORE push paths')).toEqual([
        'app/**',
        '!**/*.test.ts'
      ]);
    });

    it('throws when only pull_request has paths', () => {
      expect(error('extract: only pull_request has paths')).toMatch(/no `on\.push\.paths`/i);
    });

    it('throws when there is no paths block, rather than returning []', () => {
      // A silent [] would let the drift guard pass by accident if a `paths:` block were ever
      // deleted — the single worst outcome for a guard whose whole job is noticing that.
      expect(error('extract: no paths block')).toMatch(/no `on\.push\.paths`/i);
    });
  });

  describe('resolveFilterSet', () => {
    it('builds a release-workflow set as paths + self + excludes', () => {
      expect(value('resolve: ios release')).toEqual([
        'app/**',
        'ios/**',
        '.github/workflows/ios-release.yml',
        '!**/*.test.ts'
      ]);
    });

    it('builds the nightly set with the nightly self-references instead', () => {
      expect(value('resolve: ios nightly')).toEqual([
        'app/**',
        'ios/**',
        '.github/workflows/nightly-builds.yml',
        '!**/*.test.ts'
      ]);
    });

    it('adds watch-android/** to the nightly Android set ONLY', () => {
      expect(value('resolve: android nightly')).toContain('watch-android/**');
      // android-release.yml builds no Wear artifact, so a Wear-only change must not trigger it.
      expect(value('resolve: android release')).not.toContain('watch-android/**');
    });

    it('always puts the excludes last, or their order stops being load-bearing', () => {
      const set = value('resolve: android nightly');
      expect(set[set.length - 1]).toBe('!**/*.test.ts');
    });

    it('rejects an unknown platform loudly', () => {
      expect(error('resolve: unknown platform')).toMatch(/unknown platform/i);
    });
  });

  describe('decideBuild', () => {
    it('builds when a tracked path changed, and says which files', () => {
      expect(value('decide: changed')).toEqual({
        build: true,
        reason: 'changed',
        triggeringFiles: ['core/cards.ts']
      });
    });

    it('skips when nothing that ships changed', () => {
      expect(value('decide: unchanged')).toMatchObject({ build: false, reason: 'unchanged' });
    });

    it('builds regardless when forced', () => {
      expect(value('decide: forced beats unchanged')).toMatchObject({
        build: true,
        reason: 'forced'
      });
    });

    it('FAILS OPEN on a missing baseline', () => {
      // "We do not know what shipped last" must build. A skip produces no red X, so an
      // over-eager skip is a night nobody notices — the failure this whole story is about.
      expect(value('decide: missing baseline fails OPEN')).toMatchObject({
        build: true,
        reason: 'no-baseline'
      });
    });

    it('reports `forced` rather than `no-baseline` when both apply', () => {
      // Reason ordering matters only for the job summary, but a wrong reason there is how a
      // human mis-diagnoses a run.
      expect(value('decide: force wins over a missing baseline too')).toMatchObject({
        reason: 'forced'
      });
    });
  });

  describe('loadFilterConfig — the real committed config', () => {
    it('names the broken section instead of throwing a bare TypeError', () => {
      expect(error('config: missing section')).toMatch(/`android` must be an object/);
      expect(error('config: section without paths')).toMatch(/`excludes` must be an object/);
      expect(error('config: non-string entry')).toMatch(/every entry in `ios\.paths`/);
    });

    it('declares exactly the keys the resolver reads', () => {
      expect(Object.keys(value('config: real')).sort()).toEqual([
        'android',
        'excludes',
        'ios',
        'nightly'
      ]);
    });

    it('includes modules/** on BOTH platforms (AC4)', () => {
      // `core/wear-connectivity.ts:119` does `require('@/modules/wear-data-layer')`, so the
      // module's TypeScript reaches BOTH JS bundles even though its native half is
      // Android-only. Its absence was why a wear-data-layer change built nothing.
      const c = value('config: real');
      expect(c.ios.paths).toContain('modules/**');
      expect(c.android.paths).toContain('modules/**');
    });

    it('keeps the deliberate per-platform differences apart', () => {
      const c = value('config: real');
      // ios-release.yml: "the watch companion is iOS-only, so targets/ and watch-ios/ are
      // deliberately absent" from the Android list.
      expect(c.ios.paths).toContain('targets/**');
      expect(c.ios.paths).toContain('watch-ios/**');
      expect(c.android.paths).not.toContain('targets/**');
      expect(c.android.paths).not.toContain('watch-ios/**');
      expect(c.android.paths).toContain('android/**');
      expect(c.ios.paths).not.toContain('android/**');
    });

    it('scopes watch-android/** to the nightly Android set', () => {
      const c = value('config: real');
      expect(c.android.nightlyExtra).toContain('watch-android/**');
      expect(c.android.paths).not.toContain('watch-android/**');
    });

    it('declares every exclude as a negation and every path as a positive', () => {
      const c = value('config: real');
      expect(c.excludes.length).toBeGreaterThan(0);
      for (const p of c.excludes) expect(p.startsWith('!')).toBe(true);
      for (const key of ['ios', 'android', 'nightly']) {
        for (const p of c[key].paths ?? []) expect(p.startsWith('!')).toBe(false);
        for (const p of c[key].nightlyExtra ?? []) expect(p.startsWith('!')).toBe(false);
      }
    });
  });
});
