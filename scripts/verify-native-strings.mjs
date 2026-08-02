/* global console, process */

/**
 * Verify that literal strings we match against third-party NATIVE source still
 * exist there (Story 16.23).
 *
 * Sibling of `verify-native-patches.mjs`, and the same idea applied to a different
 * kind of fragile dependency. Some upstream error channels carry no error code —
 * `expo-camera`'s `CameraMountError` is `{ message: string }` and nothing else —
 * so the only way to turn one into a countable Sentry tag is to match its message.
 * That works, but it degrades in SILENCE: reword the message upstream and every
 * event quietly reclassifies to `'other'`, with no test failing and no build
 * breaking. The only symptom is a shifting tag distribution in production, weeks
 * later, if anyone happens to look.
 *
 * So this asserts at build time what the classifier assumes at runtime. A reworded
 * message becomes a red gate with the file and string named, instead of a slow
 * erosion of telemetry quality nobody is watching for.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const nodeModulesDir = path.join(repoRoot, 'node_modules');

/**
 * Each entry pairs a string our code matches on with the upstream file that must
 * still contain it.
 *
 * `consumer` is where the assumption lives, so a failure message can point at the
 * code that needs updating rather than only at the package that changed. The
 * consumer carries a matching pointer back here, so the cross-reference works in
 * both directions — whichever file a developer opens first.
 */
const EXPECTED_STRINGS = [
  {
    package: 'expo-camera',
    file: path.join('ios', 'Current', 'CameraSessionManager.swift'),
    consumer: 'features/add-card/components/ScannerOverlay.tsx → classifyMountError',
    strings: [
      'Camera permissions not granted',
      'Camera session was reset',
      'Camera could not be started'
    ]
  },
  {
    package: 'expo-camera',
    file: path.join(
      'android',
      'src',
      'main',
      'java',
      'expo',
      'modules',
      'camera',
      'ExpoCameraView.kt'
    ),
    consumer: 'features/add-card/components/ScannerOverlay.tsx → classifyMountError',
    strings: ['Camera component could not be rendered']
  }
];

const failures = [];

// A verification gate must never pass vacuously.
if (!existsSync(nodeModulesDir)) {
  console.error(
    '[verify-native-strings] node_modules is absent — run `yarn install` first.\n' +
      '  This gate reads third-party native source, so it cannot pass without it.'
  );
  process.exit(1);
}

let checked = 0;

for (const entry of EXPECTED_STRINGS) {
  const sourcePath = path.join(nodeModulesDir, entry.package, entry.file);

  if (!existsSync(sourcePath)) {
    failures.push(
      `${entry.package}: ${entry.file} no longer exists.\n` +
        `      Consumer: ${entry.consumer}\n` +
        '      The package layout changed upstream — re-locate the emitter and update this entry.'
    );
    continue;
  }

  const contents = readFileSync(sourcePath, 'utf8');

  for (const expected of entry.strings) {
    checked += 1;
    // Anchored to an opening quote, NOT a bare substring search, because the
    // consumer matches with `startsWith` — a position-sensitive test. A bare
    // `includes` would stay green if upstream PREPENDED to the message (say
    // `"Camera could not be started"` → `"Warning: Camera could not be
    // started"`): the substring is still in the file, while `startsWith` at
    // runtime becomes false and every event silently reclassifies to `other` —
    // exactly the failure this gate exists to prevent.
    //
    // ⚠️ Residual limit, stated rather than hidden: this cannot be made fully
    // sound without parsing Swift and Kotlin. A message assembled by
    // concatenation, or moved into a constant, would still slip past. It closes
    // the realistic reword-and-prepend cases, not every conceivable one.
    if (!contents.includes(`"${expected}`)) {
      failures.push(
        `${entry.package}/${entry.file} no longer starts a message literal with "${expected}".\n` +
          `      Consumer: ${entry.consumer}\n` +
          '      That classifier now silently reports `other` for this case. Update both the ' +
          'classifier and this entry to the new wording.'
      );
    }
  }
}

// An emptied registry must not read as success. Without this, a bad merge or an
// over-eager refactor that clears EXPECTED_STRINGS would print `OK — 0 …` and exit
// 0, which is the same vacuous pass the node_modules check above exists to avoid.
if (checked === 0) {
  failures.push(
    'No strings were checked at all — EXPECTED_STRINGS is empty or every entry has ' +
      'an empty `strings` array. A gate that verifies nothing must not report success.'
  );
}

if (failures.length > 0) {
  console.error(`[verify-native-strings] ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  ✘ ${failure}`);
  }
  process.exit(1);
}

console.log(`[verify-native-strings] OK — ${checked} native string(s) still present upstream.`);
