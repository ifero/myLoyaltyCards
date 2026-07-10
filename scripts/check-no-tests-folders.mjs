#!/usr/bin/env node
// Enforces the project convention that tests are co-located next to their
// subject as `*.test.ts(x)` — never grouped under a `__tests__/` folder.
//
// Fails (non-zero) if any tracked `__tests__/` directory exists outside the
// allowlist. Inspects `git ls-files` only, so untracked/ignored trees
// (node_modules, .claude worktrees, coverage) are never scanned.
//
// Allowlist: targets/watch/__tests__ holds watchOS contract/tooling tests that
// are NOT run by the main Jest suite (jest.config.js ignores `targets/watch/`)
// and are executed by a dedicated CI job that targets them by explicit path
// (.github/workflows/watchos-tests.yml). They intentionally stay grouped.

import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const ALLOWLIST = new Set(['targets/watch/__tests__']);

// Every tracked path that contains a `__tests__` segment implies such a dir.
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);

const offenders = new Set();
for (const file of tracked) {
  const parts = file.split('/');
  const idx = parts.indexOf('__tests__');
  if (idx === -1) continue;
  const dir = parts.slice(0, idx + 1).join('/'); // up to and including `__tests__`
  if (!ALLOWLIST.has(dir)) offenders.add(dir);
}

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
const writeSummary = (md) => {
  if (!summaryFile) return;
  try {
    appendFileSync(summaryFile, md);
  } catch {
    /* summary is best-effort */
  }
};

if (offenders.size === 0) {
  console.log('✓ No disallowed __tests__ folders — tests are co-located.');
  writeSummary('### ✅ No __tests__ folders\n\nAll tests are co-located as `*.test.ts(x)`.\n');
  process.exit(0);
}

const list = [...offenders].sort();
console.log(`✗ Found ${list.length} disallowed __tests__ folder(s):\n`);
for (const d of list) {
  console.log(`  • ${d}/`);
  console.log(`::error::Disallowed __tests__ folder: ${d}/`);
}
console.log(
  '\nCo-locate each test as `<Subject>.test.ts(x)` next to the file it covers.\n' +
    'If this is intentional watch/native test infra, add it to the ALLOWLIST in\n' +
    'scripts/check-no-tests-folders.mjs.'
);
writeSummary(
  `### ❌ Disallowed __tests__ folders\n\n` +
    `Tests must be co-located as \`*.test.ts(x)\`. Found:\n\n` +
    list.map((d) => `- \`${d}/\``).join('\n') +
    `\n`
);
process.exit(1);
