#!/usr/bin/env node
/**
 * Decide whether tonight's nightly should build one platform (Story 16.36, AC2/AC5).
 *
 * WHY THIS SCRIPT EXISTS AT ALL. GitHub applies `paths:`/`paths-ignore:` only to the push and
 * pull_request events. A `schedule:` run gets NO path filtering, so the "did anything that ships
 * change?" decision the release workflows express declaratively in `on.push.paths` has to be
 * computed here instead, against the same committed definition in
 * `.github/build-path-filters.json` that `yarn check:build-path-filters` holds those workflows to.
 *
 * Usage:
 *   node scripts/nightly-build-decision.mjs --platform ios|android \
 *     [--baseline-ref nightly/ios] [--head HEAD] [--force]
 *
 * Emits `build`, `reason`, `baseline`, `head` and `triggering` to $GITHUB_OUTPUT, and a human
 * summary to $GITHUB_STEP_SUMMARY. Exit code is 0 whether or not it decides to build — a skip is
 * a normal outcome, not a failure, and a red X on the common case trains everyone to ignore the
 * signal. It exits non-zero only when it cannot decide at all.
 *
 * FAILS OPEN. A missing or unresolvable baseline means "we do not know what shipped last", and
 * the safe answer is to ship. A skip leaves no red X, so an over-eager build costs minutes while
 * an over-eager skip costs a night nobody notices.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CONFIG_PATH,
  decideBuild,
  loadFilterConfig,
  resolveFilterSet
} from './lib/build-path-filters.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (name, fallback = undefined) => {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  // A flag given with no value (last token, or immediately followed by another flag) must fall
  // back rather than yield `undefined` and be stringified into a nonsense ref name later.
  return value === undefined || value.startsWith('--') ? fallback : value;
};
const flag = (name) => process.argv.includes(`--${name}`);

const platform = arg('platform');
if (platform !== 'ios' && platform !== 'android') {
  console.error('[nightly-build-decision] --platform must be "ios" or "android"');
  process.exit(1);
}

const baselineRef = arg('baseline-ref', `nightly/${platform}`);
const headRef = arg('head', 'HEAD');
const force = flag('force');

const git = (...args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

/** Resolve a ref to a SHA, or null when it does not exist / is not fetched. */
const resolveRef = (ref) => {
  try {
    return git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`).trim() || null;
  } catch {
    return null;
  }
};

const head = resolveRef(headRef);
if (!head) {
  console.error(`[nightly-build-decision] cannot resolve --head "${headRef}"`);
  process.exit(1);
}

const baseline = resolveRef(baselineRef);

/**
 * A TREE diff, not a commit range, on purpose: `git diff A B` answers "is what ships different?"
 * rather than "were there commits?". A revert that lands back on the previous tree correctly
 * produces no build. It also means a force-pushed or rewritten baseline still gives a sane
 * answer instead of an error.
 *
 * ⚠️ `-z` IS LOAD-BEARING, NOT TIDINESS. Git's default `core.quotePath=true` wraps any path
 * containing a non-ASCII byte, a double quote, a backslash or a control character in double
 * quotes with C-style octal escaping — `core/café.ts` comes back as `"core/caf\303\251.ts"`,
 * which then matches NO pattern and silently skips the build. Verified against this very
 * repository. `-z` emits raw NUL-separated paths and is immune. An accented brand asset is an
 * entirely plausible commit in an Italian loyalty-card catalogue, and the failure would be
 * invisible: a green, "nothing changed" night.
 *
 * `--no-renames` for a related reason: with rename detection on, moving a file OUT of a
 * triggering directory (`git mv app/big.ts docs/moved.md`) reports only the destination, so the
 * disappearance of a bundled file looks like a docs-only change. We want touched paths, not
 * rename provenance.
 */
let changedFiles = [];
let baselineMissing = !baseline;
if (baseline) {
  try {
    const out = git('diff', '--name-only', '-z', '--no-renames', baseline, head);
    changedFiles = out.split('\0').filter(Boolean);
  } catch (error) {
    console.error(
      `[nightly-build-decision] cannot diff ${baselineRef}..${headRef} ` +
        `(${error.message.trim()}) — treating the baseline as missing and building.`
    );
    baselineMissing = true;
  }
}

let patterns;
try {
  const config = loadFilterConfig(readFileSync(path.join(repoRoot, CONFIG_PATH), 'utf8'));
  patterns = resolveFilterSet(config, platform, { nightly: true });
} catch (error) {
  console.error(`[nightly-build-decision] ${CONFIG_PATH} is not usable: ${error.message}`);
  process.exit(1);
}

const { build, reason, triggeringFiles } = decideBuild({
  files: changedFiles,
  patterns,
  force,
  baselineMissing
});

const REASONS = {
  forced: 'forced by workflow_dispatch (`force: true`)',
  'no-baseline': `no \`${baselineRef}\` tag yet — failing OPEN and building`,
  changed: `${triggeringFiles.length} binary-affecting file(s) changed`,
  unchanged: `${changedFiles.length} file(s) changed, none of which can reach a ${platform} binary`
};

console.log(
  `[nightly-build-decision] ${platform}: ${build ? 'BUILD' : 'SKIP'} — ${REASONS[reason]}\n` +
    `  baseline ${baselineRef} = ${baseline ?? '(absent)'}\n` +
    `  head     ${headRef} = ${head}`
);
if (triggeringFiles.length) {
  console.log(`  triggering:\n${triggeringFiles.map((f) => `    ${f}`).join('\n')}`);
}

/**
 * The step summary is decoration: if it cannot be written, the decision is still on stdout and
 * in the job outputs, so swallowing the error is right.
 *
 * `$GITHUB_OUTPUT` is NOT decoration and must never use this. Nothing reads stdout to populate
 * `needs.*.outputs.*`, so a swallowed write there produces empty outputs — and an empty
 * `build_ios` fails `== 'true'` exactly like a legitimate skip. Green, silent, and wrong: the
 * failure shape this whole story exists to prevent.
 */
const writeBestEffort = (file, text) => {
  if (!file) return;
  try {
    appendFileSync(file, text);
  } catch {
    /* decoration only — see above */
  }
};

/** Load-bearing write: a failure here must be a red X, not a silent skip. */
const writeRequired = (file, text) => {
  if (!file) return; // not running under Actions; stdout is the interface
  try {
    appendFileSync(file, text);
  } catch (error) {
    console.error(
      `[nightly-build-decision] FATAL: could not write $GITHUB_OUTPUT (${error.message}). ` +
        'Failing loudly rather than letting empty job outputs masquerade as "nothing changed".'
    );
    process.exit(1);
  }
};

writeRequired(
  process.env.GITHUB_OUTPUT,
  [
    `build=${build}`,
    `reason=${reason}`,
    `baseline=${baseline ?? ''}`,
    `head=${head}`,
    `triggering=${triggeringFiles.length}`,
    ''
  ].join('\n')
);

// A skipped night MUST be legible without opening logs — otherwise it is indistinguishable
// from a cron that silently stopped firing, which is the failure shape Story 16.35 was about.
const FILE_CAP = 20;
writeBestEffort(
  process.env.GITHUB_STEP_SUMMARY,
  `### ${build ? '🛠️' : '💤'} ${platform}: ${build ? 'building' : 'skipped'}\n\n` +
    `${REASONS[reason]}.\n\n` +
    `| | |\n| --- | --- |\n` +
    `| baseline | \`${baselineRef}\` = ${baseline ? `\`${baseline.slice(0, 12)}\`` : '_absent_'} |\n` +
    `| head | \`${head.slice(0, 12)}\` |\n` +
    `| files changed | ${changedFiles.length} |\n` +
    `| of those, binary-affecting | ${triggeringFiles.length} |\n\n` +
    (triggeringFiles.length
      ? `<details><summary>Triggering files</summary>\n\n${triggeringFiles
          .slice(0, FILE_CAP)
          .map((f) => `- \`${f}\``)
          .join('\n')}${
          triggeringFiles.length > FILE_CAP
            ? `\n- …and ${triggeringFiles.length - FILE_CAP} more`
            : ''
        }\n\n</details>\n`
      : '') +
    '\n'
);
