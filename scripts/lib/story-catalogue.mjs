/**
 * Pure checker for the catalogue ↔ tracker invariant documented in
 * `docs/sprint-artifacts/README.md`:
 *
 *   > every `### Story N.M` there maps 1:1 to a `development_status` key here
 *
 * Nothing in here touches the filesystem — it takes the two file bodies as
 * strings and returns structured problems, so the test can drive it with inline
 * fixtures and `scripts/check-story-catalogue-sync.mjs` stays a thin CLI.
 *
 * WHY THIS EXISTS: the invariant has been broken twice in a row (Story 16.24,
 * fixed in PR #190; Story 16.25, fixed in PR #198) and both gaps were found by
 * hand. Each time the drafting PR added the tracker key and the story file but
 * not the catalogue section, which leaves `create-story` reading a tracker key
 * with no content behind it — it drafts against a story that has no acceptance
 * criteria and no goal recorded anywhere the skill looks.
 *
 * WHY IDENTITIES, NOT REGEX PAIRS: the obvious implementation greps
 * `^  (\d+)-(\d+[a-z]?)-([a-z0-9-]+):` out of the tracker, which silently drops
 * the two keys that predate the numeric convention (`12-icon-doc-cleanup`,
 * `12-figma-icon-update`) — the exact failure mode this gate is meant to remove.
 * So both sides are parsed permissively and *then* classified, and anything that
 * cannot be classified is reported rather than skipped.
 */

/** A top-level YAML mapping key — ends the `development_status:` block. */
const TOP_LEVEL_KEY = /^[A-Za-z_][A-Za-z0-9_]*:/;

/** `  16-25-map-upce…:` — a `development_status` entry (exactly two spaces). */
const TRACKER_ENTRY = /^ {2}([A-Za-z0-9][A-Za-z0-9._-]*):/;

/** `epic-16:` / `epic-16-retrospective:` — not stories, no catalogue section. */
const EPIC_KEY = /^epic-\d+(-retrospective)?$/;

/** `16-25-map-upce-instead-of-storing-as-code128` → epic 16, story `25`. */
const NUMERIC_TRACKER_KEY = /^(\d+)-(\d+[a-z]?)-[a-z0-9-]+$/;

/** Any catalogue section heading, whatever its identifier looks like. */
const HEADING = /^### Story (.+?):/;

/** The literal heading marker — used to cross-check the permissive parse. */
const HEADING_MARKER = /^### Story /;

/** `12.IC` is a heading id; `16.25` and `13.7a` are numeric heading ids. */
const NUMERIC_HEADING_ID = /^(\d+)\.(\d+[a-z]?)$/;

/**
 * `_Tracker key: \`12-icon-doc-cleanup\` (…)._` — an in-document escape hatch for
 * a section whose heading id does not derive from its tracker key. Declaring it
 * in the prose keeps the mapping where a human reading the catalogue will see it,
 * and means a future oddity is fixed by editing the doc rather than this script.
 */
const DECLARED_KEY = /_Tracker key:\s*`([^`]+)`/;

/** `totalStories: 169` inside the epics.md frontmatter. */
const TOTAL_STORIES = /^totalStories:\s*(\d+)/;

/**
 * Split epics.md into `### Story …` sections.
 *
 * Section bodies run to the next `###`/`##` heading so a `_Tracker key:_`
 * declaration can only ever be claimed by the section it sits in.
 */
export function parseCatalogue(markdown) {
  const lines = markdown.split('\n');

  // Frontmatter only — a `totalStories:` mention in the prose must not count.
  let totalStories = null;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
    for (const line of lines.slice(1, end === -1 ? lines.length : end)) {
      const match = line.match(TOTAL_STORIES);
      if (match) totalStories = Number(match[1]);
    }
  }

  const sections = [];
  let current = null;
  const closeCurrent = () => {
    if (!current) return;
    current.declaredKey = current.body.join('\n').match(DECLARED_KEY)?.[1] ?? null;
    delete current.body;
    sections.push(current);
    current = null;
  };

  let markerCount = 0;
  lines.forEach((line, i) => {
    if (HEADING_MARKER.test(line)) markerCount += 1;

    const heading = line.match(HEADING);
    if (heading) {
      closeCurrent();
      current = { id: heading[1].trim(), line: i + 1, body: [] };
      return;
    }
    // Any other heading at h2/h3 closes the section — `#### …` stays inside it.
    if (/^#{2,3} /.test(line)) closeCurrent();
    else if (current) current.body.push(line);
  });
  closeCurrent();

  return { sections, totalStories, markerCount };
}

/** Pull the `development_status:` keys out of sprint-status.yaml. */
export function parseTracker(yamlText) {
  const lines = yamlText.split('\n');
  const start = lines.findIndex((line) => /^development_status:/.test(line));
  if (start === -1) return { entries: [], blockFound: false };

  const entries = [];
  for (const [offset, line] of lines.slice(start + 1).entries()) {
    if (TOP_LEVEL_KEY.test(line)) break; // next top-level key ends the block
    const match = line.match(TRACKER_ENTRY);
    if (match) entries.push({ key: match[1], line: start + offset + 2 });
  }

  return { entries, blockFound: true };
}

/**
 * The shared identity both sides are compared on.
 *
 * Numeric stories reduce to `N.M` (so `16-25-map-upce…` and `### Story 16.25:`
 * meet), and anything else is identified by its literal tracker key. The two
 * shapes cannot collide: an `N.M` identity always contains a `.` and never a `-`.
 */
const numericIdentity = (epic, story) => `${epic}.${story}`;

/**
 * Compare the catalogue against the tracker.
 *
 * @returns {{problems: Array<{code: string, message: string}>, stats: object}}
 *   `problems` is empty exactly when the invariant holds.
 */
export function checkStoryCatalogueSync({ epicsMarkdown, trackerYaml }) {
  const problems = [];
  const fail = (code, message) => problems.push({ code, message });

  const { sections, totalStories, markerCount } = parseCatalogue(epicsMarkdown);
  const { entries, blockFound } = parseTracker(trackerYaml);

  // --- Vacuity guards: a gate that parsed nothing must not report success. ---
  if (!blockFound) {
    fail(
      'no-tracker-block',
      'sprint-status.yaml has no `development_status:` block — nothing could be checked.'
    );
  }
  if (sections.length === 0) {
    fail(
      'no-headings-parsed',
      'epics.md yielded no `### Story <id>: <title>` sections — nothing could be checked.'
    );
  }
  if (markerCount !== sections.length) {
    fail(
      'heading-unparsed',
      `epics.md has ${markerCount} \`### Story \` line(s) but only ${sections.length} parsed as ` +
        '`### Story <id>: <title>`. Every heading needs an id followed by a colon.'
    );
  }

  const storyEntries = entries.filter(({ key }) => !EPIC_KEY.test(key));
  if (blockFound && storyEntries.length === 0) {
    fail(
      'no-tracker-keys-parsed',
      '`development_status:` yielded no story keys (only `epic-N` entries) — nothing could be checked.'
    );
  }

  // --- Tracker side: key → identity. ---
  const trackerByIdentity = new Map();
  for (const entry of storyEntries) {
    const numeric = entry.key.match(NUMERIC_TRACKER_KEY);
    const identity = numeric ? numericIdentity(numeric[1], numeric[2]) : entry.key;
    const existing = trackerByIdentity.get(identity);
    if (existing) {
      fail(
        'duplicate-tracker-identity',
        `tracker keys \`${existing.key}\` (line ${existing.line}) and \`${entry.key}\` ` +
          `(line ${entry.line}) both resolve to story ${identity}.`
      );
      continue;
    }
    trackerByIdentity.set(identity, entry);
  }

  // --- Catalogue side: heading → identity. A declaration always wins, so a
  //     section whose id does not derive from its key can still be matched. ---
  const catalogueByIdentity = new Map();
  for (const section of sections) {
    const numeric = section.id.match(NUMERIC_HEADING_ID);
    let identity;

    if (section.declaredKey) {
      // Reduce a declared key through the same rule as the tracker side, so
      // declaring the numeric key of a numeric section is a no-op, not a mismatch.
      const declaredNumeric = section.declaredKey.match(NUMERIC_TRACKER_KEY);
      identity = declaredNumeric
        ? numericIdentity(declaredNumeric[1], declaredNumeric[2])
        : section.declaredKey;
    } else if (numeric) {
      identity = numericIdentity(numeric[1], numeric[2]);
    } else {
      fail(
        'heading-needs-tracker-key-declaration',
        `epics.md:${section.line} \`### Story ${section.id}:\` has a non-numeric id and no ` +
          'tracker-key declaration, so it cannot be matched. Add a line to the section body:\n' +
          '        _Tracker key: `<the-development_status-key>` (…)._'
      );
      continue;
    }

    const existing = catalogueByIdentity.get(identity);
    if (existing) {
      fail(
        'duplicate-catalogue-identity',
        `epics.md sections \`### Story ${existing.id}:\` (line ${existing.line}) and ` +
          `\`### Story ${section.id}:\` (line ${section.line}) both claim story ${identity}.`
      );
      continue;
    }
    catalogueByIdentity.set(identity, section);
  }

  // --- Both directions. ---
  for (const [identity, entry] of trackerByIdentity) {
    if (catalogueByIdentity.has(identity)) continue;
    fail(
      'tracker-key-missing-section',
      `tracker key \`${entry.key}\` (sprint-status.yaml:${entry.line}) has no catalogue section.\n` +
        `        Add a \`### Story ${identity}: <title>\` section to docs/epics.md, or drop the key.`
    );
  }

  for (const [identity, section] of catalogueByIdentity) {
    if (trackerByIdentity.has(identity)) continue;
    fail(
      'section-missing-tracker-key',
      `epics.md:${section.line} \`### Story ${section.id}:\` has no \`development_status\` key.\n` +
        `        Add \`${identity}-<slug>: backlog\` to sprint-status.yaml, or drop the section.`
    );
  }

  // --- `totalStories` frontmatter, against the rule recorded in the file. ---
  if (totalStories === null) {
    fail(
      'total-stories-missing',
      'epics.md frontmatter has no `totalStories:` field. It must equal the number of ' +
        '`### Story ` headings.'
    );
  } else if (totalStories !== markerCount) {
    fail(
      'total-stories-mismatch',
      `epics.md frontmatter says \`totalStories: ${totalStories}\` but the file has ` +
        `${markerCount} \`### Story \` heading(s). Update the frontmatter to ${markerCount}.`
    );
  }

  return {
    problems,
    stats: {
      headings: sections.length,
      trackerStoryKeys: storyEntries.length,
      totalStories,
      declaredKeys: sections.filter((s) => s.declaredKey).length
    }
  };
}
