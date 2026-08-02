// Shared helpers for resolving a story reference (from PR text / CLI input) to an
// existing story slug under docs/sprint-artifacts/stories/. Used by both
// scripts/mark-story-done.mjs and scripts/check-pr-conventions.mjs.

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STORIES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'docs/sprint-artifacts/stories'
);

const listStories = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];

export const findStoryByPrefix = (prefix, dir = STORIES_DIR) => {
  const files = listStories(dir);
  if (files.includes(`${prefix}.md`)) return prefix;
  const hit = files.find((f) => f.startsWith(`${prefix}-`));
  return hit ? hit.replace(/\.md$/, '') : null;
};

// A story reference spelled out in prose: "Story 16.24", "story 13-7a".
//
// The `story` keyword is REQUIRED. Without it this matched any `N.M` / `N-M`
// token anywhere in the input, and since the only other check is "does a story
// file with that prefix exist", ordinary PR prose could silently resolve to a
// real story: a version bump ("16.24"), a coverage number ("13.7%"), a date
// fragment, a run id. `scripts/mark-story-done.mjs` then advanced any such story
// sitting at `Status: review` straight to `done` and committed it to the default
// branch — so an unrelated PR could close someone else's in-flight story.
//
// `(?![.-]\d)` rejects a third dotted/dashed segment, so "story 1.2.3" (a version
// that merely follows the word) is not read as story 1.2. Story ids are always
// two segments — `16-24`, `13-7a` — never three.
//
// `\b` keeps "backstory 5.9" from matching on the "story" substring.
const STORY_REF_RE = /\bstory\s+(\d+)[.-](\d+[a-z]?)(?![.-]\d)/gi;

// The same reference with the `story` keyword optional, i.e. a bare "16-24".
// Only ever applied to explicit CLI arguments, where the whole input is a story
// id a human deliberately typed (`node scripts/mark-story-done.mjs 5-9`, which
// CONTRIBUTING.md documents) rather than prose that happens to contain digits.
const BARE_STORY_REF_RE = /\b(?:story\s+)?(\d+)[.-](\d+[a-z]?)(?![.-]\d)/gi;

// Resolve all story slugs referenced by `text`, returning only slugs whose story
// file actually exists. Resolution order:
//   0. an exact slug (e.g. "5-9-edit-card")
//   1. story-file paths: stories/<slug>.md
//   2. a "Story X.Y" reference, matched against the stories dir
//
// `allowBareNumeric` additionally accepts a keyword-less "X-Y" at step 2. Pass it
// only for trusted, deliberate input (CLI args) — never for PR title/body text.
export const resolveStorySlugs = (text, dir = STORIES_DIR, { allowBareNumeric = false } = {}) => {
  const slugs = new Set();
  const trimmed = (text ?? '').trim();

  if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed) && existsSync(join(dir, `${trimmed}.md`))) {
    return [trimmed];
  }

  const pathRe = /stories\/([A-Za-z0-9][A-Za-z0-9._-]*?)\.md/g;
  let m;
  while ((m = pathRe.exec(text ?? ''))) {
    if (existsSync(join(dir, `${m[1]}.md`))) slugs.add(m[1]);
  }

  if (slugs.size === 0) {
    // Fresh copy: these are module-level /g regexes, so a shared `lastIndex`
    // would leak between calls.
    const numRe = new RegExp(allowBareNumeric ? BARE_STORY_REF_RE : STORY_REF_RE);
    while ((m = numRe.exec(text ?? ''))) {
      const found = findStoryByPrefix(`${m[1]}-${m[2]}`, dir);
      if (found) slugs.add(found);
    }
  }

  return [...slugs];
};
