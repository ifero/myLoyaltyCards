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
  const slugs = resolveStorySlugs(`${PR_TITLE}\n${PR_BODY}`);
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
