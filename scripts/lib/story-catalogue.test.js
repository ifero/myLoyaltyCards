/**
 * @jest-environment node
 */
// Unit tests for checkStoryCatalogueSync() — the comparison behind
// `yarn check:story-catalogue-sync`, which enforces that every `### Story N.M`
// heading in docs/epics.md maps 1:1 to a `development_status` key in
// docs/sprint-artifacts/sprint-status.yaml.
//
// WHY A SUBPROCESS: story-catalogue.mjs is a plain Node ESM module in scripts/,
// and Jest compiles through babel.config.test.js, which targets Hermes/React
// Native and emits CommonJS. `moduleFileExtensions` also omits `mjs`. Rather than
// change the transform for every app test to reach a build script, each fixture is
// evaluated in one real `node --input-type=module` child — the same approach
// story-refs.test.js takes, and the same ESM semantics CI runs. All cases share a
// single spawn, resolved in beforeAll.
//
// WHY SYNTHETIC FIXTURES, NOT THE REAL DOCS: asserting that the checked-in
// epics.md and sprint-status.yaml are in sync is the CI gate's job, and doing it
// here too would red the whole test suite on any docs drift — the wrong signal in
// the wrong place. These fixtures pin the *rules* instead.
//
// Assertions are on problem `code`s, never prose, so the messages stay editable.

const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const MODULE_URL = pathToFileURL(require.resolve('./story-catalogue.mjs')).href;

/** epics.md is frontmatter + prose; only `totalStories` matters to the checker. */
const epics = (totalStories, body) =>
  [
    '---',
    "project_name: 'myLoyaltyCards'",
    ...(totalStories === null ? [] : [`totalStories: ${totalStories}`]),
    '---',
    '',
    '## Epic 1: Test',
    '',
    body
  ].join('\n');

/** sprint-status.yaml, reduced to the block the checker reads. */
const tracker = (...lines) =>
  ['generated: 2026-01-03', 'development_status:', ...lines, 'action_items: []'].join('\n');

const SECTION_1_1 = '### Story 1.1: Do the thing\n\n**As a** user…\n';
const SECTION_1_2 = '### Story 1.2: Do the other thing\n\n**As a** user…\n';

// [name, epicsMarkdown, trackerYaml] — evaluated in order by the child process.
const CASES = [
  [
    'in sync',
    epics(2, `${SECTION_1_1}\n${SECTION_1_2}`),
    tracker('  epic-1: done', '  1-1-do-the-thing: done', '  1-2-do-the-other-thing: backlog')
  ],

  // The regression this gate exists for: PR #186 and #189 each added a tracker
  // key and a story file but no catalogue section (Story 16.24, then 16.25).
  [
    'tracker key with no catalogue section',
    epics(1, SECTION_1_1),
    tracker('  1-1-do-the-thing: done', '  1-2-do-the-other-thing: ready-for-dev')
  ],
  [
    'catalogue section with no tracker key',
    epics(2, `${SECTION_1_1}\n${SECTION_1_2}`),
    tracker('  1-1-do-the-thing: done')
  ],

  // Problem 1 in the brief: `### Story 12.IC:` / `### Story 12.FI:` have
  // non-numeric ids and tracker keys (`12-icon-doc-cleanup`,
  // `12-figma-icon-update`) that do not derive from them. They are matched by the
  // `_Tracker key:` declaration already present in each section's prose.
  [
    'non-numeric heading matched by its declared tracker key',
    epics(
      2,
      `${SECTION_1_1}\n### Story 1.IC: Icon doc cleanup\n\n` +
        '_Tracker key: `1-icon-doc-cleanup` (non-numeric `IC` identifier)._\n'
    ),
    tracker('  1-1-do-the-thing: done', '  1-icon-doc-cleanup: done')
  ],
  [
    'declared tracker key that does not exist in the tracker',
    epics(
      1,
      '### Story 1.IC: Icon doc cleanup\n\n_Tracker key: `1-icon-doc-cleanup` (non-numeric)._\n'
    ),
    tracker('  1-1-do-the-thing: done')
  ],
  // A section whose id cannot be derived AND carries no declaration must be
  // reported, never skipped. The trailing section proves a later declaration is
  // not leaked backwards into an earlier section.
  [
    'non-numeric heading with no declaration at all',
    epics(
      2,
      '### Story 1.IC: Icon doc cleanup\n\nNo declaration here.\n\n' +
        '### Story 1.FI: Figma icon update\n\n_Tracker key: `1-figma-icon-update` (non-numeric)._\n'
    ),
    tracker('  1-icon-doc-cleanup: done', '  1-figma-icon-update: done')
  ],
  // The other half of problem 1: a naive `^  (\d+)-(\d+[a-z]?)-…` tracker regex
  // drops this key entirely, so an orphaned non-numeric key would pass unnoticed.
  [
    'non-numeric tracker key claimed by nothing',
    epics(1, SECTION_1_1),
    tracker('  1-1-do-the-thing: done', '  1-icon-doc-cleanup: done')
  ],

  // Problem 2 in the brief: totalStories has drifted repeatedly under three
  // different counting rules. Pinned to the literal `### Story ` count, which is
  // the rule epics.md now records inline.
  [
    'totalStories disagrees with the heading count',
    epics(7, `${SECTION_1_1}\n${SECTION_1_2}`),
    tracker('  1-1-do-the-thing: done', '  1-2-do-the-other-thing: done')
  ],
  ['totalStories absent', epics(null, SECTION_1_1), tracker('  1-1-do-the-thing: done')],
  // `totalStories` is read from the frontmatter only — a prose mention of the
  // field must not be picked up as the declared value.
  [
    'totalStories mentioned in prose after the frontmatter',
    `${epics(1, SECTION_1_1)}\n> Note: totalStories: 999 is counted from headings.\n`,
    tracker('  1-1-do-the-thing: done')
  ],

  [
    'letter-suffixed story id',
    epics(1, '### Story 13.7a: Import data\n'),
    tracker('  13-7a-import-data-from-json: done')
  ],
  [
    'epic and retrospective keys are not stories',
    epics(1, SECTION_1_1),
    tracker(
      '  # Epic 1: Foundation',
      '  epic-1: done # completed 2026-01-07',
      '  1-1-do-the-thing: done',
      '  epic-1-retrospective: optional'
    )
  ],
  // The real tracker carries multi-hundred-word inline `#` comments on story
  // lines, comment-only lines, and blank lines inside the block.
  [
    'inline comments and blank lines inside the block',
    epics(1, SECTION_1_1),
    tracker(
      '  # ============================================',
      '',
      '  1-1-do-the-thing: done # 2026-08-02: a very long note about: colons, `backticks`, 1-2-3 refs.',
      '    nested-not-a-story-key: ignored'
    )
  ],

  // Vacuity guards — a checker that parsed nothing must not report success.
  ['empty development_status block', epics(1, SECTION_1_1), tracker()],
  ['no development_status block at all', epics(1, SECTION_1_1), 'generated: 2026-01-03\n'],
  [
    'no story headings at all',
    epics(0, '## Epic 1: Test\n\nNo stories here.\n'),
    tracker('  1-1-do-the-thing: done')
  ],
  [
    'heading with no colon after the id',
    epics(2, `${SECTION_1_1}\n### Story 1.2 Missing its colon\n`),
    tracker('  1-1-do-the-thing: done', '  1-2-do-the-other-thing: done')
  ],

  [
    'two sections claiming one story',
    epics(2, `${SECTION_1_1}\n### Story 1.1: Duplicated\n`),
    tracker('  1-1-do-the-thing: done')
  ],
  [
    'two tracker keys resolving to one story',
    epics(1, SECTION_1_1),
    tracker('  1-1-do-the-thing: done', '  1-1-do-the-thing-again: backlog')
  ]
];

/** Evaluate every case in one child process; return name -> {codes, stats}. */
const runCases = () => {
  const harness = `
    import { checkStoryCatalogueSync } from ${JSON.stringify(MODULE_URL)};
    const cases = JSON.parse(process.env.CASES_JSON);
    process.stdout.write(
      JSON.stringify(
        cases.map(([, epicsMarkdown, trackerYaml]) => {
          const { problems, stats } = checkStoryCatalogueSync({ epicsMarkdown, trackerYaml });
          return { codes: problems.map((p) => p.code).sort(), messages: problems.map((p) => p.message), stats };
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
    throw new Error(`story-catalogue harness failed:\n${err.stderr || err.message}`);
  }

  const results = JSON.parse(stdout);
  return Object.fromEntries(CASES.map(([name], i) => [name, results[i]]));
};

describe('checkStoryCatalogueSync', () => {
  let resolved;

  beforeAll(() => {
    resolved = runCases();
  });

  const codes = (name) => resolved[name].codes;

  it('reports nothing when the catalogue and the tracker agree', () => {
    expect(codes('in sync')).toEqual([]);
    expect(resolved['in sync'].stats).toMatchObject({
      headings: 2,
      trackerStoryKeys: 2,
      totalStories: 2
    });
  });

  describe('both directions of the 1:1 mapping', () => {
    it('flags a tracker key with no catalogue section', () => {
      expect(codes('tracker key with no catalogue section')).toEqual([
        'tracker-key-missing-section'
      ]);
    });

    it('names the story to add, so the fix needs no further digging', () => {
      expect(resolved['tracker key with no catalogue section'].messages[0]).toContain(
        '### Story 1.2:'
      );
    });

    it('flags a catalogue section with no tracker key', () => {
      expect(codes('catalogue section with no tracker key')).toEqual([
        'section-missing-tracker-key'
      ]);
    });
  });

  describe('non-numeric ids are matched, never dropped', () => {
    it('matches a non-numeric heading via its declared tracker key', () => {
      expect(codes('non-numeric heading matched by its declared tracker key')).toEqual([]);
      expect(
        resolved['non-numeric heading matched by its declared tracker key'].stats.declaredKeys
      ).toBe(1);
    });

    it('still checks a declared key against the tracker', () => {
      expect(codes('declared tracker key that does not exist in the tracker')).toEqual([
        'section-missing-tracker-key',
        'tracker-key-missing-section'
      ]);
    });

    it('demands a declaration when the id cannot be derived', () => {
      expect(codes('non-numeric heading with no declaration at all')).toEqual([
        'heading-needs-tracker-key-declaration',
        'tracker-key-missing-section'
      ]);
    });

    it('flags a non-numeric tracker key that no section claims', () => {
      expect(codes('non-numeric tracker key claimed by nothing')).toEqual([
        'tracker-key-missing-section'
      ]);
    });

    it('accepts a letter-suffixed story id', () => {
      expect(codes('letter-suffixed story id')).toEqual([]);
    });
  });

  describe('totalStories is pinned to the literal heading count', () => {
    it('flags a stale count', () => {
      expect(codes('totalStories disagrees with the heading count')).toEqual([
        'total-stories-mismatch'
      ]);
    });

    it('flags a missing field', () => {
      expect(codes('totalStories absent')).toEqual(['total-stories-missing']);
    });

    it('reads the frontmatter only, not a prose mention', () => {
      expect(codes('totalStories mentioned in prose after the frontmatter')).toEqual([]);
    });
  });

  describe('tracker parsing', () => {
    it('ignores epic and retrospective keys', () => {
      expect(codes('epic and retrospective keys are not stories')).toEqual([]);
    });

    it('survives inline comments, comment-only lines and deeper indentation', () => {
      expect(codes('inline comments and blank lines inside the block')).toEqual([]);
    });
  });

  describe('it never passes vacuously', () => {
    it('fails when the block holds no story keys', () => {
      expect(codes('empty development_status block')).toEqual([
        'no-tracker-keys-parsed',
        'section-missing-tracker-key'
      ]);
    });

    it('fails when there is no development_status block', () => {
      expect(codes('no development_status block at all')).toEqual([
        'no-tracker-block',
        'section-missing-tracker-key'
      ]);
    });

    it('fails when no headings parse', () => {
      expect(codes('no story headings at all')).toEqual([
        'no-headings-parsed',
        'tracker-key-missing-section'
      ]);
    });

    it('fails when a `### Story` line does not parse as a heading', () => {
      expect(codes('heading with no colon after the id')).toEqual([
        'heading-unparsed',
        'tracker-key-missing-section'
      ]);
    });
  });

  describe('ambiguity is a failure, not a coin flip', () => {
    it('flags two sections claiming one story', () => {
      expect(codes('two sections claiming one story')).toEqual(['duplicate-catalogue-identity']);
    });

    it('flags two tracker keys resolving to one story', () => {
      expect(codes('two tracker keys resolving to one story')).toEqual([
        'duplicate-tracker-identity'
      ]);
    });
  });
});
