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

// Resolve all story slugs referenced by `text`, returning only slugs whose story
// file actually exists. Resolution order:
//   0. an exact slug (e.g. "5-9-edit-card")
//   1. story-file paths: stories/<slug>.md
//   2. a "Story X.Y" / "X-Y" reference, matched against the stories dir
export const resolveStorySlugs = (text, dir = STORIES_DIR) => {
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
    const numRe = /(?:story\s+)?(\d+)[.-](\d+[a-z]?)/gi;
    while ((m = numRe.exec(text ?? ''))) {
      const found = findStoryByPrefix(`${m[1]}-${m[2]}`, dir);
      if (found) slugs.add(found);
    }
  }

  return [...slugs];
};
