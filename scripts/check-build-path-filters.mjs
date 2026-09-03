#!/usr/bin/env node
/**
 * Enforce that the release workflows' `on.push.paths` agree with
 * `.github/build-path-filters.json` — the single source of truth for
 * "can this change reach a shipped binary?" (Story 16.36).
 *
 * WHY A GUARD RATHER THAN AN EXTRACTION. `on.push.paths` cannot reference an external file, so
 * the list has to be duplicated into each workflow. It was duplicated twice already and the two
 * copies had drifted: neither listed `modules/**`, so a change to the local Expo module
 * `modules/wear-data-layer/` triggered no build at all. The duplication is irreducible; what is
 * fixable is that it used to be silent.
 *
 * The nightly is the reason this matters now. GitHub applies `paths:` only to the push and
 * pull_request events, so a `schedule:` run computes the decision itself from this config — and
 * a stale entry in an unattended 03:00 job does not fail, it quietly stops shipping.
 *
 * The comparison lives in `scripts/lib/build-path-filters.mjs` (pure, unit-tested); this file
 * only resolves paths, prints, and sets the exit code.
 */

import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIG_PATH,
  GUARDED_WORKFLOWS,
  checkBuildPathFilters,
  loadFilterConfig
} from './lib/build-path-filters.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const read = (relative) => {
  try {
    return readFileSync(path.join(repoRoot, relative), 'utf8');
  } catch (error) {
    console.error(`[check-build-path-filters] cannot read ${relative}: ${error.message}`);
    process.exit(1);
  }
};

let config;
try {
  config = loadFilterConfig(read(CONFIG_PATH));
} catch (error) {
  console.error(`[check-build-path-filters] ${CONFIG_PATH} is not usable: ${error.message}`);
  process.exit(1);
}

const { problems, stats } = checkBuildPathFilters({
  config,
  workflows: GUARDED_WORKFLOWS.map(({ platform, path: file }) => ({
    platform,
    path: file,
    text: read(file)
  }))
});

const writeSummary = (markdown) => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;
  try {
    appendFileSync(summaryFile, markdown);
  } catch {
    /* summary is best-effort */
  }
};

if (problems.length === 0) {
  console.log(
    `[check-build-path-filters] OK — ${stats.workflows} workflow(s) match ${CONFIG_PATH} ` +
      `(${stats.iosPaths} iOS + ${stats.androidPaths} Android path(s), ${stats.excludes} exclude(s)).`
  );
  writeSummary(
    '### ✅ Build path filters in sync\n\n' +
      `${stats.workflows} release workflow(s) agree with \`${CONFIG_PATH}\`.\n`
  );
  process.exit(0);
}

console.error(`[check-build-path-filters] ${problems.length} problem(s):`);
for (const { code, message } of problems) {
  console.error(`  ✘ [${code}] ${message}`);
  // Single-line GitHub annotation — the multi-line fix hints stay in the log.
  console.error(`::error::${code}: ${message.split('\n')[0]}`);
}
console.error(
  `\nEdit \`${CONFIG_PATH}\` first, then mirror the change into the workflow named above.\n` +
    'Both lists must match entry-for-entry AND in order: GitHub resolves `paths` per file by\n' +
    'LAST match wins, so moving a negative pattern ahead of a positive one silently changes\n' +
    'which commits build.\n\n' +
    'If a path genuinely belongs to only one workflow, it belongs in the config too — see\n' +
    '`android.nightlyExtra`, which is how `watch-android/**` reaches the nightly without\n' +
    'reaching `android-release.yml` (whose lane builds no Wear artifact).'
);

writeSummary(
  '### ❌ Build path filters out of sync\n\n' +
    `Each release workflow's \`on.push.paths\` must match \`${CONFIG_PATH}\`.\n\n` +
    problems.map(({ code, message }) => `- **${code}** — ${message.split('\n')[0]}`).join('\n') +
    '\n'
);
process.exit(1);
