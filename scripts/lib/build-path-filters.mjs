// The binary-affecting path-filter primitives (Story 16.36).
//
// Two consumers, one definition:
//   * `scripts/check-build-path-filters.mjs` — the CI/pre-push drift guard, which fails when a
//     release workflow's `on.push.paths` disagrees with `.github/build-path-filters.json`.
//   * `scripts/nightly-build-decision.mjs` — the nightly's change gate, which has to compute
//     the decision itself because GitHub applies `paths:` ONLY to the push and pull_request
//     events. A `schedule:` run receives no path filtering at all.
//
// NODE BUILTINS ONLY, deliberately. No YAML parser and no glob library is a declared dependency
// of this repo — `js-yaml` and `minimatch` are merely transitive, and relying on a transitive is
// the same landmine as the undeclared `@types/node` that forces `scripts/` tests to be
// `.test.js`. So the glob subset and the `paths:` block scanner are implemented here and
// covered by build-path-filters.test.js.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Where the single source of truth lives, relative to the repo root. */
export const CONFIG_PATH = '.github/build-path-filters.json';

/** The workflows whose `on.push.paths` the drift guard holds to the config. */
export const GUARDED_WORKFLOWS = [
  { platform: 'ios', path: '.github/workflows/ios-release.yml' },
  { platform: 'android', path: '.github/workflows/android-release.yml' }
];

/**
 * Translate the glob subset these filters actually use into an anchored RegExp.
 *
 * Supported, because it is all GitHub's `paths` needs here:
 *   `dir/**`          everything under a directory
 *   `**‍/*.ext`        any depth, including none — `**‍/` may match zero directories
 *   `*`               within one path segment; never crosses `/`
 *   literal segments  every regex metacharacter escaped
 *
 * The two bugs this shape exists to avoid: an unanchored pattern lets `app/**` match
 * `docs/app/x` and `apple/x`, and an unescaped `.` lets `app.json` match `appXjson`.
 */
export const globToRegExp = (pattern) => {
  const segments = pattern.split('/');
  let source = '^';

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;

    if (segment === '**') {
      // Trailing `**` swallows the rest of the path; an interior one spans whole segments
      // and may span none, which is what makes `**‍/*.test.ts` match a top-level file.
      source += isLast ? '.*' : '(?:[^/]+/)*';
      return;
    }

    source += segment.replace(/[.*+?^${}()|[\]\\]/g, (char) =>
      char === '*' ? '[^/]*' : `\\${char}`
    );
    // A following interior `**` emits its own trailing slash, so `a/**/b` stays `a/(…/)*b`
    // and still matches `a/b` — the separator belongs here either way.
    if (!isLast) source += '/';
  });

  return new RegExp(`${source}$`);
};

/** Whether one repo-relative file path matches one glob (no `!` handling — see below). */
export const matchesGlob = (file, pattern) => globToRegExp(pattern).test(file);

/**
 * Whether a file is included by an ordered pattern list, using GitHub's own semantics:
 * **the LAST matching pattern wins.**
 *
 * This is the load-bearing detail. First-match-wins would make every commit that touches a
 * `*.test.ts` skip the build, because the negatives sit at the end of the list; and a negative
 * placed BEFORE its positive must NOT exclude, which is why the workflow comments say the
 * order matters. Both directions are pinned by tests.
 */
export const fileIsIncluded = (file, patterns) => {
  let included = false;
  for (const raw of patterns) {
    const negated = raw.startsWith('!');
    if (matchesGlob(file, negated ? raw.slice(1) : raw)) included = !negated;
  }
  return included;
};

/**
 * The subset of a change set that justifies a build.
 *
 * Returned rather than reduced to a boolean so the caller can say *why* it is building — a
 * skipped night has to be legible in the Actions UI without opening logs, or it is
 * indistinguishable from a broken cron.
 */
export const selectTriggeringFiles = (files, patterns) =>
  files.filter((file) => fileIsIncluded(file, patterns));

/**
 * Read the ordered `on.push.paths` list out of a workflow file.
 *
 * A line scanner rather than a YAML parse, for the no-dependency reason at the top of this
 * file. It finds the `paths:` key nested under `push:` — NOT merely the first `paths:` in the
 * file — and stops at the next line whose indentation is at or above the block's own, so it
 * cannot run on and swallow unrelated keys further down.
 *
 * Throws when there is no block. A silent `[]` would let the drift guard pass by accident if a
 * `paths:` block were ever deleted, which is the one outcome a guard like this must never have.
 */
export const extractWorkflowPaths = (yamlText) => {
  // `\r` is stripped before anything else: JS `.` does not match it and `$` without `/m`
  // anchors to the end of the string, so a CRLF file made every item regex fail and the
  // function returned a silent `[]` — the one outcome its own contract forbids.
  const lines = yamlText.replace(/\r\n?/g, '\n').split('\n');

  // Find `paths:` UNDER `push:`, not merely the first `paths:` in the file. Both guarded
  // workflows happen to have exactly one today, but `watchos-tests.yml` and
  // `wear-os-build.yml` each carry a `pull_request.paths` block ahead of their `push` one —
  // so "the first `paths:`" is correct here only by luck, and would silently compare the
  // wrong list the moment a `pull_request` trigger is added to a guarded workflow.
  let inPush = false;
  let pushIndent = -1;
  let startIndex = -1;

  for (const [index, line] of lines.entries()) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);

    if (/^\s*push:\s*$/.test(line)) {
      inPush = true;
      pushIndent = indent;
      continue;
    }
    // Any other key at or above `push:`'s indentation closes the block.
    if (inPush && indent <= pushIndent) inPush = false;

    if (inPush && /^\s*paths:\s*$/.test(line)) {
      startIndex = index;
      break;
    }
  }

  if (startIndex === -1) {
    throw new Error(
      'no `on.push.paths` block found — a workflow guarded by check-build-path-filters must ' +
        'declare one, and a missing block is the failure this guard exists to catch'
    );
  }

  const blockIndent = lines[startIndex].search(/\S/);
  const paths = [];

  for (const line of lines.slice(startIndex + 1)) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    if (indent <= blockIndent) break;

    const item = /^\s*-\s*(.*)$/.exec(line);
    if (!item) break;

    paths.push(unquoteItem(item[1].trim()));
  }

  return paths;
};

/**
 * Strip a YAML scalar's quotes and any trailing comment, in the right order.
 *
 * The order is the whole point: matching `^'(.*)'$` first means a QUOTED item that also has a
 * trailing comment (`- 'app/**' # why`) fails the anchor, falls through to comment-stripping,
 * and keeps its now-orphaned quote characters — producing a phantom drift report.
 */
const unquoteItem = (raw) => {
  const quoted = /^'((?:[^']|'')*)'|^"((?:[^"\\]|\\.)*)"/.exec(raw);
  if (quoted) {
    // Only single quotes have a YAML escape worth undoing here (`''` -> `'`).
    return quoted[1] !== undefined ? quoted[1].replace(/''/g, "'") : quoted[2];
  }
  return raw.replace(/\s+#.*$/, '');
};

/**
 * Strip `$comment` documentation keys and flatten `{ $comment, paths }` wrappers.
 *
 * Every section is validated by NAME rather than dereferenced blindly. A malformed config
 * otherwise surfaces as `Cannot read properties of undefined (reading 'paths')`, which says
 * nothing about which section is broken — and a section present but EMPTY would normalise to
 * `undefined` and only explode later, in a spread, far from the cause.
 */
const normalize = (raw) => {
  const list = (where, node) => {
    if (!node || !Array.isArray(node.paths)) {
      throw new Error(`${CONFIG_PATH}: \`${where}\` must be an object with a \`paths\` array`);
    }
    if (node.paths.some((entry) => typeof entry !== 'string')) {
      throw new Error(`${CONFIG_PATH}: every entry in \`${where}.paths\` must be a string`);
    }
    return node.paths;
  };

  return {
    ios: { paths: list('ios', raw.ios) },
    android: {
      paths: list('android', raw.android),
      nightlyExtra: list('android.nightlyExtra', raw.android && raw.android.nightlyExtra)
    },
    nightly: { paths: list('nightly', raw.nightly) },
    excludes: list('excludes', raw.excludes)
  };
};

/** Load and normalize the committed config. `configText` is for tests and callers with it in hand. */
export const loadFilterConfig = (configText) =>
  normalize(JSON.parse(configText ?? readFileSync(join(REPO_ROOT, CONFIG_PATH), 'utf8')));

/**
 * Assemble the ordered pattern list for one platform.
 *
 * `{ selfPath }` builds a release workflow's expected list (its own filename in the slot the
 * nightly fills with `nightly.paths`); `{ nightly: true }` builds the nightly's runtime list,
 * which also picks up `android.nightlyExtra` — `watch-android/**`, because the nightly ships
 * the Wear AAB and `fastlane android adhoc` does not.
 *
 * `excludes` is appended LAST in both cases, or its order stops meaning anything.
 */
export const resolveFilterSet = (config, platform, options = {}) => {
  if (platform !== 'ios' && platform !== 'android') {
    throw new Error(`unknown platform "${platform}" — expected "ios" or "android"`);
  }

  const { nightly = false, selfPath } = options;
  const extra = nightly && platform === 'android' ? config.android.nightlyExtra : [];
  const self = nightly ? config.nightly.paths : [selfPath];

  return [...config[platform].paths, ...extra, ...self, ...config.excludes];
};

/**
 * Decide whether one platform's nightly should build.
 *
 * Pure, so the three reasons a build happens are pinned by tests rather than by reading YAML.
 * FAILS OPEN by design: `baselineMissing` means "we do not know what shipped last", and the
 * safe answer to that is to ship, not to skip. A skip has no red X, so an over-eager build
 * costs minutes while an over-eager skip costs a night nobody notices.
 */
export const decideBuild = ({ files, patterns, force = false, baselineMissing = false }) => {
  if (force) return { build: true, reason: 'forced', triggeringFiles: [] };
  if (baselineMissing) return { build: true, reason: 'no-baseline', triggeringFiles: [] };

  const triggeringFiles = selectTriggeringFiles(files, patterns);
  return {
    build: triggeringFiles.length > 0,
    reason: triggeringFiles.length > 0 ? 'changed' : 'unchanged',
    triggeringFiles
  };
};

/**
 * The drift comparison behind `yarn check:build-path-filters`.
 *
 * `workflows` is `[{ platform, path, text }]`. Returns `{ problems, stats }` in the same shape
 * as checkStoryCatalogueSync(), so the CLI wrapper and its failure output stay consistent with
 * the repo's other gates. Problems carry a stable `code` so tests never assert on prose.
 */
export const checkBuildPathFilters = ({ config, workflows }) => {
  const problems = [];

  for (const { platform, path, text } of workflows) {
    const expected = resolveFilterSet(config, platform, { selfPath: path });

    let actual;
    try {
      actual = extractWorkflowPaths(text);
    } catch (error) {
      problems.push({
        code: 'workflow-paths-unreadable',
        workflow: path,
        message: `${path}: ${error.message}`
      });
      continue;
    }

    if (actual.length === expected.length && actual.every((p, i) => p === expected[i])) continue;

    const missing = expected.filter((p) => !actual.includes(p));
    const unexpected = actual.filter((p) => !expected.includes(p));

    problems.push({
      code:
        missing.length || unexpected.length ? 'workflow-paths-differ' : 'workflow-paths-misordered',
      workflow: path,
      missing,
      unexpected,
      message:
        `${path}: \`on.push.paths\` disagrees with ${CONFIG_PATH}.` +
        (missing.length ? `\n    missing (add to the workflow):    ${missing.join(', ')}` : '') +
        (unexpected.length
          ? `\n    unexpected (add to the config):  ${unexpected.join(', ')}`
          : '') +
        (!missing.length && !unexpected.length
          ? '\n    same entries, different ORDER — order is load-bearing (last match wins).'
          : '')
    });
  }

  return {
    problems,
    stats: {
      workflows: workflows.length,
      iosPaths: config.ios.paths.length,
      androidPaths: config.android.paths.length,
      excludes: config.excludes.length
    }
  };
};
