#!/usr/bin/env node
// Validates a pull request against the machine-checkable rules in CONTRIBUTING.md.
// Exits non-zero (failing CI) on any violation.
//
// Rules enforced:
//   1. PR title is a Conventional Commit: <type>(<scope>): <summary>
//   2. Branch name uses an allowed prefix (feature/ fix/ refactor/ docs/ chore/)
//   3. Spec-first: code changes reference an existing story
//      (docs:/chore: titles, catalogue PRs, and `design`-labelled PRs are exempt —
//       the design label covers token/visual polish per docs/design/CONTRIBUTING-DESIGN.md)
//   4. No CI-skip marker in the title or body — a squash merge copies both into the
//      commit message on main, where GitHub honours a skip instruction anywhere, so
//      the marker would silently skip the "never bypass" quality gates
//
// Inputs via env: PR_TITLE, PR_BODY, HEAD_REF, PR_LABELS (comma-separated).

import { appendFileSync } from 'node:fs';
import { resolveStorySlugs } from './lib/story-refs.mjs';

const PR_TITLE = process.env.PR_TITLE ?? '';
const PR_BODY = process.env.PR_BODY ?? '';
const HEAD_REF = process.env.HEAD_REF ?? '';
const LABELS = (process.env.PR_LABELS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// The surface a squash merge lands on main: the title becomes the commit subject and
// the body becomes the commit body. Rules 3 and 4 both scan it.
const TITLE_AND_BODY = `${PR_TITLE}\n${PR_BODY}`;

const TYPES = ['feat', 'fix', 'refactor', 'docs', 'test', 'chore'];
const BRANCH_PREFIXES = ['feature', 'fix', 'refactor', 'docs', 'chore'];

const violations = [];

// 1) Conventional Commit PR title
const titleMatch = PR_TITLE.match(
  /^(feat|fix|refactor|docs|test|chore)(\(([a-z0-9._-]+)\))?(!)?: .+/
);
if (!titleMatch) {
  violations.push(
    [
      'PR title is not a Conventional Commit.',
      `  Got:      "${PR_TITLE}"`,
      '  Expected: <type>(<scope>): <summary>   e.g. "feat(watch): add complication (Story 5.9)"',
      `  Allowed types: ${TYPES.join(', ')}`
    ].join('\n')
  );
}
const type = titleMatch?.[1];
const scope = titleMatch?.[3];

// 2) Branch naming
if (HEAD_REF && !new RegExp(`^(${BRANCH_PREFIXES.join('|')})/.+`).test(HEAD_REF)) {
  violations.push(
    [
      'Branch name does not follow the convention.',
      `  Got:      "${HEAD_REF}"`,
      `  Expected: one of ${BRANCH_PREFIXES.map((p) => `${p}/…`).join(', ')}`
    ].join('\n')
  );
}

// 3) Spec-first: code changes must reference an existing story
const storyExempt =
  ['docs', 'chore'].includes(type) ||
  scope === 'catalogue' ||
  LABELS.includes('catalogue') ||
  LABELS.includes('design');
if (!storyExempt) {
  const slugs = resolveStorySlugs(TITLE_AND_BODY);
  if (slugs.length === 0) {
    violations.push(
      [
        'Spec-first: this looks like a code change but references no story.',
        '  Link a docs/sprint-artifacts/stories/<id>.md story in the PR body, or end the',
        '  title with "(Story X.Y)". (docs:/chore: titles and catalogue- or design-labelled PRs are exempt.)'
      ].join('\n')
    );
  }
}

// 4) No CI-skip marker in the title or body
//
// A squash merge folds the PR title into the subject and the PR body into the body of
// the one commit that lands on main, and GitHub honours a skip instruction found
// ANYWHERE in a commit message — not just the subject. ci-quality-gates.yml runs on
// `push: branches: [main]` with no skip guard of its own, so a PR that merely *writes*
// a marker silently suppresses the gate run CONTRIBUTING.md calls "never bypass".
// Backticks do not help: to GitHub's scanner they are ordinary adjacent characters.
// This has happened twice — 115709d (a marker in prose on body line 12) and 0a4a018.
//
// The brackets are load-bearing. Requiring them keeps innocent prose ("no CI guard")
// clear of the check and leaves `skip-ci` free as the safe way to write about a
// marker. `[ \t]` rather than `\s` between the words, so a line ending in "skip"
// followed by one starting "ci]" cannot false-positive across the newline.
//
// The legitimate producer of skip-ci commits is mark-story-done.yml, which commits
// straight to the default branch and never opens a PR (and this workflow skips Bot
// authors regardless), so nothing here interferes with it.
const CI_SKIP_MARKERS = [
  ['[skip ci]', /\[[ \t]*skip[ \t]+ci[ \t]*\]/i],
  ['[ci skip]', /\[[ \t]*ci[ \t]+skip[ \t]*\]/i],
  ['[no ci]', /\[[ \t]*no[ \t]+ci[ \t]*\]/i],
  ['[skip actions]', /\[[ \t]*skip[ \t]+actions[ \t]*\]/i],
  ['[actions skip]', /\[[ \t]*actions[ \t]+skip[ \t]*\]/i],
  ['skip-checks trailer', /\bskip-checks[ \t]*:[ \t]*true\b/i]
];
const foundMarkers = CI_SKIP_MARKERS.filter(([, re]) => re.test(TITLE_AND_BODY)).map(([l]) => l);
if (foundMarkers.length > 0) {
  violations.push(
    [
      'PR title/body must not contain a CI-skip marker.',
      `  Found:    ${foundMarkers.join(', ')}`,
      "  A squash merge copies the PR title and body into main's commit message, and GitHub",
      '  honours a skip instruction anywhere in it — so merging this would silently skip the',
      '  quality gates CONTRIBUTING.md marks "never bypass".',
      '  To write ABOUT a marker, hyphenate it (skip-ci) or split it across two code spans so',
      '  a backtick sits between the words — backticks alone do not help.'
    ].join('\n')
  );
}

// ---- report -----------------------------------------------------------------

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const writeSummary = (md) => {
  if (summaryFile) {
    try {
      appendFileSync(summaryFile, md);
    } catch {
      /* summary is best-effort */
    }
  }
};

if (violations.length === 0) {
  console.log('✓ PR follows the CONTRIBUTING conventions.');
  writeSummary('### ✅ PR conventions\n\nThis PR follows the CONTRIBUTING.md conventions.\n');
  process.exit(0);
}

console.log(`✗ PR does not follow CONTRIBUTING.md (${violations.length} issue(s)):\n`);
for (const v of violations) {
  console.log(`  • ${v}\n`);
  // GitHub annotation (first line only)
  console.log(`::error::${v.split('\n')[0]}`);
}
console.log('See CONTRIBUTING.md for the full contribution rules.');

writeSummary(
  `### ❌ PR conventions\n\n` +
    `This PR does not follow [CONTRIBUTING.md](../blob/main/CONTRIBUTING.md):\n\n` +
    violations.map((v) => `- ${v.split('\n')[0]}`).join('\n') +
    `\n`
);

process.exit(1);
