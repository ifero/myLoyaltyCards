// Story status, read from and written to the two shapes a story file takes in this repo.
//
//   spec    — a YAML frontmatter key, `status: 'in-review'`. This is what `bmad-build` (BMAD 6.12)
//             reads and writes on the spec it keeps at `stories/<key>.md`.
//   legacy  — a body line, `Status: review` (or the older `**Status:** review`), written by the 6.10
//             dev-story workflow or by hand. Most older stories have one: of the 167 files when this
//             was written, 132 do, 32 keep the status in a table row that neither shape matches, and
//             3 have none. Those 35 read null, and the merge automation leaves them alone.
//
// Frontmatter wins, but only when it carries a `status` KEY. Some legacy files also open with a
// frontmatter block (47 of the 167, holding `baseline_commit:` and, in five, `retroactive` and
// `completed_in`), so the block being there says nothing about which shape the file is.
//
// `bmad-build` calls a spec `in-review` while its change is being reviewed and `done` the moment its
// own run ends. This repo means something stricter by `done` — merged — so the two review spellings
// are interchangeable here, and `review` is what the tracker calls the same state.
//
// Plain Node ESM with no dependencies, so scripts/mark-story-done.mjs can run in CI without an install.
// Line endings are LF, which is what prettier enforces on every tracked story file.

const FRONTMATTER = /^---\n[\s\S]*?\n---(?=\n|$)/;

// `status: in-review`, `status: 'in-review'`, `status: "in-review" # note` — quotes and a trailing
// comment are kept when the value is rewritten.
const FRONTMATTER_STATUS = /^(status:[ \t]*)(['"]?)([A-Za-z][A-Za-z-]*)\2([ \t]*(?:#.*)?)$/m;

const BODY_STATUS = /^(\*\*Status:\*\*|Status:)([ \t]*)(\S+)(.*)$/m;

/** The states in which a story is waiting for its PR to merge. */
export const AWAITING_MERGE = ['review', 'in-review'];

const split = (text) => {
  const match = FRONTMATTER.exec(text);
  return match ? { head: match[0], body: text.slice(match[0].length) } : { head: '', body: text };
};

/** The story file's status token, or null when neither shape carries one. */
export const readStoryStatus = (text) => {
  const { head, body } = split(text);
  const fromFrontmatter = FRONTMATTER_STATUS.exec(head);
  if (fromFrontmatter) return fromFrontmatter[3];
  const fromBody = BODY_STATUS.exec(body);
  return fromBody ? fromBody[3] : null;
};

/**
 * Whether a merge should advance this story to done. `fileStatus` is the story file's status and
 * `trackerStatus` the tracker's. A file at `done` with the tracker still at `review` counts: that is
 * the state `bmad-build` leaves behind when its own run ends, before any PR exists.
 */
export const isWaitingForMerge = (fileStatus, trackerStatus) =>
  AWAITING_MERGE.includes(fileStatus) || (fileStatus === 'done' && trackerStatus === 'review');

/** The same text with its status set to `done`, or the text itself when there is no status to set. */
export const markStoryDone = (text) => {
  const { head, body } = split(text);
  if (FRONTMATTER_STATUS.test(head)) {
    return (
      head.replace(
        FRONTMATTER_STATUS,
        (_match, key, quote, _token, tail) => `${key}${quote}done${quote}${tail}`
      ) + body
    );
  }
  return (
    head +
    body.replace(BODY_STATUS, (_match, label, gap, _token, tail) => `${label}${gap}done${tail}`)
  );
};
