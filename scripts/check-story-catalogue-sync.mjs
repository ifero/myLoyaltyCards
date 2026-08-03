#!/usr/bin/env node
/**
 * Enforce the catalogue ↔ tracker invariant from `docs/sprint-artifacts/README.md`:
 * every `### Story N.M` heading in `docs/epics.md` maps 1:1 to a
 * `development_status` key in `docs/sprint-artifacts/sprint-status.yaml`.
 *
 * Also checks the `totalStories` frontmatter field against the literal
 * `### Story ` heading count — the counting rule the file itself records, and one
 * that has been redefined three times while the number drifted.
 *
 * The comparison lives in `scripts/lib/story-catalogue.mjs` (pure, unit-tested);
 * this file only resolves paths, prints, and sets the exit code.
 */

import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkStoryCatalogueSync } from './lib/story-catalogue.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EPICS = 'docs/epics.md';
const TRACKER = 'docs/sprint-artifacts/sprint-status.yaml';

const read = (relative) => {
  try {
    return readFileSync(path.join(repoRoot, relative), 'utf8');
  } catch (error) {
    console.error(`[check-story-catalogue-sync] cannot read ${relative}: ${error.message}`);
    process.exit(1);
  }
};

const { problems, stats } = checkStoryCatalogueSync({
  epicsMarkdown: read(EPICS),
  trackerYaml: read(TRACKER)
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
    `[check-story-catalogue-sync] OK — ${stats.headings} catalogue section(s) ↔ ` +
      `${stats.trackerStoryKeys} tracker key(s), totalStories: ${stats.totalStories}.`
  );
  writeSummary(
    '### ✅ Story catalogue in sync with the tracker\n\n' +
      `${stats.headings} \`### Story\` section(s) in \`${EPICS}\` map 1:1 to ` +
      `${stats.trackerStoryKeys} \`development_status\` key(s).\n`
  );
  process.exit(0);
}

console.error(`[check-story-catalogue-sync] ${problems.length} problem(s):`);
for (const { code, message } of problems) {
  console.error(`  ✘ [${code}] ${message}`);
  // Single-line GitHub annotation — the multi-line fix hints stay in the log.
  console.error(`::error::${code}: ${message.split('\n')[0]}`);
}
console.error(
  `\nThe catalogue and the tracker must agree in both directions: ${TRACKER} is the\n` +
    `source of truth for status, and ${EPICS} is where \`create-story\` reads a story's\n` +
    'goal and acceptance criteria. A tracker key with no section is a story that can be\n' +
    'picked up with no content behind it.'
);

writeSummary(
  '### ❌ Story catalogue out of sync with the tracker\n\n' +
    `Every \`### Story N.M\` in \`${EPICS}\` must map 1:1 to a \`development_status\` key in \`${TRACKER}\`.\n\n` +
    problems.map(({ code, message }) => `- **${code}** — ${message.split('\n')[0]}`).join('\n') +
    '\n'
);
process.exit(1);
