/**
 * @jest-environment node
 */
// Black-box tests for the PR-conventions gate — chiefly rule 4, which stops a PR from
// carrying a CI-skip marker onto main. A squash merge copies the PR title into the
// commit subject and the PR body into the commit body, and GitHub honours a skip
// instruction found ANYWHERE in a commit message, so a marker written even as prose
// silently suppresses the `push: branches: [main]` run of ci-quality-gates.yml — the
// gate CONTRIBUTING.md calls "never bypass". Commit 115709d did exactly that with a
// backticked mention on body line 12; the "backticked prose" case below is its shape
// and is the regression this file guards.
//
// WHY BLACK BOX, ONE SPAWN PER CASE: check-pr-conventions.mjs reads process.env at
// module scope and calls process.exit() at top level, so it cannot be imported and
// re-invoked with different inputs. Jest also compiles through babel.config.test.js,
// which targets Hermes/React Native and emits CommonJS, where the `import.meta` in its
// ./lib/story-refs.mjs dependency is a hard syntax error — the same constraint
// scripts/lib/story-refs.test.js documents. Each case therefore runs the real script in
// a real node child, exactly as .github/workflows/pr-conventions.yml does. All spawns
// happen once in beforeAll; the `it`s only read the resulting map.
//
// WHY chore(…) TITLES: a `chore:` title is story-exempt, so the rule-4 cases exercise
// rule 4 alone. Asserting `issues: 1` on each of them proves that isolation held rather
// than assuming it.
//
// WHY A MINIMAL ENV: process.env is deliberately NOT spread into the child. On a GitHub
// runner that would leak the real GITHUB_STEP_SUMMARY and make every case append to the
// live job summary, and would let an ambient PR_* variable bleed into the inputs.
//
// ASSERTIONS are on the exit code, the violation count, and whether the rule's FIRST
// line appeared — the text GitHub surfaces as the ::error:: annotation and the
// step-summary bullet. Never on the guidance prose, so the wording stays editable.

const { execFileSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const SCRIPT = join(__dirname, 'check-pr-conventions.mjs');
const STORIES_DIR = join(__dirname, '..', 'docs', 'sprint-artifacts', 'stories');

// A title and branch that satisfy rules 1–3, so only rule 4 can fail.
const CLEAN_TITLE = 'chore(ci): guard PR bodies against CI-skip markers';
const CLEAN_REF = 'chore/guard-ci-skip-markers';

// First lines of the violations, i.e. the ::error:: annotation text.
const RULE_1 = 'PR title is not a Conventional Commit.';
const RULE_2 = 'Branch name does not follow the convention.';
const RULE_3 = 'Spec-first: this looks like a code change but references no story.';
const RULE_4 = 'PR title/body must not contain a CI-skip marker.';

// resolveStorySlugs only returns slugs whose file exists and there is no seam to point
// it at a fixture, so the rule-3 case needs a real story. Discover one at run time —
// hardcoding an id would rot the moment that story is renamed. The id-shaped filter
// skips the validation reports and other non-story .md files in the same directory.
const A_REAL_STORY = readdirSync(STORIES_DIR)
  .filter((f) => /^\d+-\d+[a-z]?-.+\.md$/.test(f))
  .sort()[0];

// [name, { title?, body?, ref? }] — one child process each.
const CASES = [
  // Each of the six skip instructions GitHub recognises, plus the trailer's other
  // spelling. Any one of these reaching main disables the gate run.
  ['skip ci', { body: 'Tidy-up only [skip ci]' }],
  ['ci skip', { body: 'Tidy-up only [ci skip]' }],
  ['no ci', { body: 'Tidy-up only [no ci]' }],
  ['skip actions', { body: 'Tidy-up only [skip actions]' }],
  ['actions skip', { body: 'Tidy-up only [actions skip]' }],
  ['skip-checks trailer', { body: 'Tidy-up only\n\n\nskip-checks: true' }],
  ['skip-checks trailer unspaced', { body: 'Tidy-up only\n\n\nskip-checks:true' }],

  // Shapes a naive check misses.
  [
    'backticked prose',
    { body: 'committed to the default branch with `[skip ci]` so nothing re-runs.' }
  ],
  ['uppercase', { body: 'Tidy-up only [SKIP CI]' }],
  ['inner whitespace', { body: 'Tidy-up only [ skip\tci ]' }],
  ['in the title', { title: 'chore(sprint): mark story done after merge [skip ci]' }],

  // The safe ways to write about a marker, and prose that merely contains "no CI".
  // "clean body" is the non-vacuity guard: without it a harness that always failed
  // would still make every positive case above pass.
  ['clean body', { body: 'Adds a fourth rule to scripts/check-pr-conventions.mjs.' }],
  ['hyphenated', { body: 'The bot commit carries a skip-ci marker; this PR must not.' }],
  ['split code spans', { body: 'Write it as `[skip` `ci]` to stay clear of this check.' }],
  ['innocent no CI prose', { body: 'There was no CI guard for this before.' }],
  ['skip-checks false', { body: 'The trailer only counts as skip-checks: false here.' }],
  ['skipped ci', { body: 'Nothing was [skipped ci] in this run.' }],

  // Rules 1–3 must be unaffected. "story ref in body" is the one that matters: it is
  // the only case proving the TITLE_AND_BODY constant still carries the body through
  // to resolveStorySlugs, since a non-exempt title with a resolvable story passes.
  ['bad title', { title: 'no type here' }],
  ['bad branch', { ref: 'feat/wrong-prefix' }],
  [
    'story ref in body',
    { title: 'feat(ci): x', body: `Implements docs/sprint-artifacts/stories/${A_REAL_STORY}` }
  ],
  ['code change without story', { title: 'feat(ci): x', body: 'No story anywhere in here.' }]
];

// Run one case and reduce its output to the contract: exit code, how many violations
// fired, and which rules they were.
const run = ({ title = CLEAN_TITLE, body = '', ref = CLEAN_REF }) => {
  const env = {
    PATH: process.env.PATH,
    PR_TITLE: title,
    PR_BODY: body,
    HEAD_REF: ref,
    PR_LABELS: ''
  };

  let status = 0;
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [SCRIPT], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env
    });
  } catch (err) {
    if (err.status === undefined || err.status === null) {
      throw new Error(`check-pr-conventions did not exit cleanly:\n${err.stderr || err.message}`);
    }
    status = err.status;
    stdout = err.stdout ?? '';
  }

  const count = stdout.match(/\((\d+) issue\(s\)\)/);
  return {
    status,
    issues: count ? Number(count[1]) : 0,
    rules: [RULE_1, RULE_2, RULE_3, RULE_4].filter((r) => stdout.includes(r))
  };
};

describe('check-pr-conventions', () => {
  let results;

  beforeAll(() => {
    results = Object.fromEntries(CASES.map(([name, input]) => [name, run(input)]));
  });

  // Every rule-4 case is a `chore:` PR on a `chore/` branch, so `issues: 1` with only
  // RULE_4 present means rule 4 fired and nothing else did.
  const onlyRule4 = { status: 1, issues: 1, rules: [RULE_4] };
  const passes = { status: 0, issues: 0, rules: [] };

  describe('rule 4 rejects every skip instruction GitHub recognises', () => {
    it('rejects [skip ci]', () => {
      expect(results['skip ci']).toEqual(onlyRule4);
    });

    it('rejects [ci skip]', () => {
      expect(results['ci skip']).toEqual(onlyRule4);
    });

    it('rejects [no ci]', () => {
      expect(results['no ci']).toEqual(onlyRule4);
    });

    it('rejects [skip actions]', () => {
      expect(results['skip actions']).toEqual(onlyRule4);
    });

    it('rejects [actions skip]', () => {
      expect(results['actions skip']).toEqual(onlyRule4);
    });

    it('rejects a skip-checks trailer', () => {
      expect(results['skip-checks trailer']).toEqual(onlyRule4);
    });

    it('rejects a skip-checks trailer written without a space', () => {
      expect(results['skip-checks trailer unspaced']).toEqual(onlyRule4);
    });
  });

  describe('rule 4 catches the shapes a naive check misses', () => {
    // The 115709d regression. Backticks are ordinary adjacent characters to GitHub's
    // scanner, so wrapping a marker in them protects nothing.
    it('rejects a marker wrapped in backticks as prose', () => {
      expect(results['backticked prose']).toEqual(onlyRule4);
    });

    it('rejects an uppercase marker', () => {
      expect(results['uppercase']).toEqual(onlyRule4);
    });

    it('rejects a marker padded with extra whitespace and tabs', () => {
      expect(results['inner whitespace']).toEqual(onlyRule4);
    });

    // A marker in the title is worse: it becomes the commit subject, and rule 1's
    // Conventional-Commit regex accepts it as a valid `chore(sprint): …` summary.
    it('rejects a marker in the title, not just the body', () => {
      expect(results['in the title']).toEqual(onlyRule4);
    });
  });

  describe('rule 4 leaves safe prose alone', () => {
    it('passes a PR that mentions no marker at all', () => {
      expect(results['clean body']).toEqual(passes);
    });

    it('passes the hyphenated form the error message recommends', () => {
      expect(results['hyphenated']).toEqual(passes);
    });

    it('passes a marker split across two code spans', () => {
      expect(results['split code spans']).toEqual(passes);
    });

    it('passes prose that merely contains "no CI"', () => {
      expect(results['innocent no CI prose']).toEqual(passes);
    });

    it('passes a skip-checks trailer set to false', () => {
      expect(results['skip-checks false']).toEqual(passes);
    });

    it('passes a bracketed near-miss like [skipped ci]', () => {
      expect(results['skipped ci']).toEqual(passes);
    });
  });

  describe('rules 1-3 still behave', () => {
    // A malformed title also trips rule 3: `type` is undefined, so the docs/chore
    // exemption does not apply and the story scan runs.
    it('still rejects a non-Conventional-Commit title', () => {
      expect(results['bad title'].rules).toEqual([RULE_1, RULE_3]);
    });

    it('still rejects an off-convention branch prefix', () => {
      expect(results['bad branch']).toEqual({ status: 1, issues: 1, rules: [RULE_2] });
    });

    it('still resolves a story path out of the body', () => {
      expect(results['story ref in body']).toEqual(passes);
    });

    it('still rejects a code change that references no story', () => {
      expect(results['code change without story']).toEqual({
        status: 1,
        issues: 1,
        rules: [RULE_3]
      });
    });
  });
});
