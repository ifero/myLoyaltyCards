#!/usr/bin/env node
// Marks the story referenced by a PR as "done" in BOTH:
//   - docs/sprint-artifacts/sprint-status.yaml   (the development_status map)
//   - docs/sprint-artifacts/stories/<slug>.md    (the "Status:" line)
//
// GATE: a story is only advanced to "done" when its story file currently reads
// "Status: review". Any other status (backlog/drafted/ready-for-dev/in-progress)
// is left untouched — a merged PR that merely references a non-review story must
// not complete it. The story .md is the source of truth (sprint-status.yaml never
// holds "review"; it is the OUTPUT of this script, not the gate).
//
// Story reference resolution (first that matches wins):
//   0. An exact slug passed as an arg (e.g. "5-9-edit-card").
//   1. Any `docs/sprint-artifacts/stories/<slug>.md` path found in the input.
//   2. A "Story X.Y" / "X-Y" reference, resolved by globbing the stories dir.
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPRINT_STATUS = join(ROOT, 'docs/sprint-artifacts/sprint-status.yaml');
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const log = (...a) => console.log('[mark-story-done]', ...a);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A story is only advanced to "done" from this status (read off the story file).
const REQUIRED_STATUS = 'review';

const write = (file, contents) => {
  if (DRY_RUN) {
    log(`(dry-run) would write ${file}`);
    return;
  }
  writeFileSync(file, contents);
};

// Current status token from the story file's "Status:" line (plain or **bold**),
// or null if the file or the line is missing.
const readStoryFileStatus = (slug) => {
  const file = join(STORIES_DIR, `${slug}.md`);
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/^(?:\*\*Status:\*\*|Status:)[ \t]*(\S+)/m);
  return m ? m[1] : null;
};

const markStoryFile = (slug) => {
  const file = join(STORIES_DIR, `${slug}.md`);
  if (!existsSync(file)) {
    log(`⚠ story file not found: ${slug}.md`);
    return false;
  }
  const before = readFileSync(file, 'utf8');
  // Match "Status: <x>" (plain or legacy **bold**); set to done, keep label + tail.
  const after = before.replace(
    /^(\*\*Status:\*\*|Status:)([ \t]*)\S+(.*)$/m,
    (_m, label, gap, tail) => `${label}${gap}done${tail}`
  );
  if (after === before) {
    log(`• story file unchanged (already done or no "Status:" line): ${slug}.md`);
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
  // "  <slug>: <status>[ # trailing comment]" — set status to done, keep the comment
  const re = new RegExp(`^(\\s*${escapeRe(slug)}:\\s*)(\\S+)(.*)$`, 'm');
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

const input =
  process.argv.slice(2).join(' ').trim() ||
  `${process.env.PR_TITLE ?? ''}\n${process.env.PR_BODY ?? ''}`;

const slugs = resolveStorySlugs(input);

if (slugs.length === 0) {
  log('No story reference found in input — nothing to do.');
  process.exit(0);
}

log(`Resolved story slug(s): ${slugs.join(', ')}`);

let changed = false;
for (const slug of slugs) {
  // Gate: only advance a story to "done" if its story file says "review".
  const status = readStoryFileStatus(slug);
  if (status !== REQUIRED_STATUS) {
    log(
      `• skip ${slug}: story status is "${status ?? 'unknown'}", not "${REQUIRED_STATUS}" — leaving unchanged`
    );
    continue;
  }
  const storyChanged = markStoryFile(slug);
  const statusChanged = markSprintStatus(slug);
  changed = changed || storyChanged || statusChanged;
}

log(changed ? 'Done — files updated.' : 'No changes (already up to date).');
process.exit(0);
