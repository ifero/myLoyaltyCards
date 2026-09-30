#!/usr/bin/env node
// Marks the story referenced by a PR as "done" in BOTH:
//   - docs/sprint-artifacts/sprint-status.yaml   (the development_status map)
//   - docs/sprint-artifacts/stories/<slug>.md    (its status — see lib/story-status.mjs)
//
// GATE: a story is only advanced to "done" when it is waiting for this merge: its
// story file reads "Status: review" (the legacy body line) or `status: in-review`
// (the spec frontmatter `bmad-build` writes). Any other status
// (backlog/drafted/ready-for-dev/in-progress) is left untouched — a merged PR that
// merely references a story that is not in review must not complete it. The story
// .md is the source of truth; sprint-status.yaml is the OUTPUT of this script.
//
// One exception, and it is deliberate: `bmad-build` marks a spec "done" when its own
// run ends, before any PR exists, and moves the tracker to "review". That pair —
// file "done", tracker "review" — is a story waiting for this merge, so it is
// accepted too. Without it, a run that skipped the repo's on_complete step (which
// moves the spec back to "in-review") would leave the tracker at "review" for good.
//
// Story reference resolution (first that matches wins):
//   0. An exact slug passed as an arg (e.g. "5-9-edit-card").
//   1. Any `docs/sprint-artifacts/stories/<slug>.md` path found in the input.
//   2. A "Story X.Y" reference, resolved by globbing the stories dir.
//
// A keyword-less "X-Y" is accepted ONLY from an explicit CLI arg, where the input
// is a story id a human deliberately typed. PR title/body is prose: a bare "16.24"
// there is far more likely to be a version, a percentage or a date fragment than a
// story reference, and resolving it would mark an unrelated in-flight story done.
//
// Input comes from CLI args, or the PR_TITLE / PR_BODY env vars (used in CI).
// Set DRY_RUN=1 to preview changes without writing.
//
// Usage:
//   node scripts/mark-story-done.mjs                  # reads PR_TITLE + PR_BODY
//   node scripts/mark-story-done.mjs 5-9              # by story number
//   node scripts/mark-story-done.mjs "Story 5.9"     # by reference
//   DRY_RUN=1 node scripts/mark-story-done.mjs 5-9    # preview only

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveStorySlugs, STORIES_DIR } from './lib/story-refs.mjs';
import { isWaitingForMerge, markStoryDone, readStoryStatus } from './lib/story-status.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRINT_STATUS = join(ROOT, 'docs/sprint-artifacts/sprint-status.yaml');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const log = (...a) => console.log('[mark-story-done]', ...a);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const write = (file, contents) => {
  if (DRY_RUN) {
    log(`(dry-run) would write ${file}`);
    return;
  }
  writeFileSync(file, contents);
};

// Current status token of the story file (spec frontmatter `status:` or a "Status:" body
// line), or null if the file or the field is missing.
const readStoryFileStatus = (slug) => {
  const file = join(STORIES_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  return readStoryStatus(readFileSync(file, 'utf8'));
};

// "  <slug>: <status>[ # trailing comment]" — the tracker's entry for a story.
const trackerEntry = (slug) => new RegExp(`^(\\s*${escapeRe(slug)}:\\s*)(\\S+)(.*)$`, 'm');

// The tracker's status token for a story, or null if there is no entry.
const readTrackerStatus = (slug) => {
  if (!existsSync(SPRINT_STATUS)) return null;
  const m = readFileSync(SPRINT_STATUS, 'utf8').match(trackerEntry(slug));
  return m ? m[2] : null;
};

const markStoryFile = (slug) => {
  const file = join(STORIES_DIR, `${slug}.md`);
  if (!existsSync(file)) {
    log(`⚠ story file not found: ${slug}.md`);
    return false;
  }
  const before = readFileSync(file, 'utf8');
  const after = markStoryDone(before);
  if (after === before) {
    log(`• story file unchanged (already done or no status field): ${slug}.md`);
    return false;
  }
  write(file, after);
  log(`✓ story file → done: ${slug}.md`);
  return true;
};

const markSprintStatus = (slug) => {
  if (!existsSync(SPRINT_STATUS)) {
    log('⚠ sprint-status.yaml not found');
    return false;
  }
  const before = readFileSync(SPRINT_STATUS, 'utf8');
  // Set the status to done, keep the trailing comment.
  const re = trackerEntry(slug);
  if (!re.test(before)) {
    log(`⚠ sprint-status has no development_status entry for: ${slug}`);
    return false;
  }
  const after = before.replace(re, (_full, head, _status, tail) => `${head}done${tail}`);
  if (after === before) {
    log(`• sprint-status unchanged (already done): ${slug}`);
    return false;
  }
  write(SPRINT_STATUS, after);
  log(`✓ sprint-status → done: ${slug}`);
  return true;
};

// ---- main -------------------------------------------------------------------

const argvInput = process.argv.slice(2).join(' ').trim();
const input = argvInput || `${process.env.PR_TITLE ?? ''}\n${process.env.PR_BODY ?? ''}`;

// Bare "5-9" is honoured for a CLI arg only — see the header note on why PR prose
// must spell the reference out as "Story X.Y" or link the story file.
const slugs = resolveStorySlugs(input, STORIES_DIR, { allowBareNumeric: argvInput !== '' });

if (slugs.length === 0) {
  log('No story reference found in input — nothing to do.');
  process.exit(0);
}

log(`Resolved story slug(s): ${slugs.join(', ')}`);

let changed = false;
for (const slug of slugs) {
  // Gate: only advance a story that is waiting for this merge (see the header note).
  const status = readStoryFileStatus(slug);
  if (!isWaitingForMerge(status, readTrackerStatus(slug))) {
    log(
      `• skip ${slug}: story status is "${status ?? 'unknown'}", not waiting for a merge ("review" / "in-review") — leaving unchanged`
    );
    continue;
  }
  const storyChanged = markStoryFile(slug);
  const statusChanged = markSprintStatus(slug);
  changed = changed || storyChanged || statusChanged;
}

log(changed ? 'Done — files updated.' : 'No changes (already up to date).');
process.exit(0);
