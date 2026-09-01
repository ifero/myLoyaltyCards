#!/usr/bin/env node
/**
 * Assert the Wear OS release artifact is signed with the SAME certificate as the phone
 * release artifact, before either is uploaded to Play (Story 16.35, AC5).
 *
 * Why this gate exists: an *unsigned* APK fails loudly at Play, but a *wrong-key*
 * APK uploads cleanly and then breaks silently — the Wearable Data Layer refuses to
 * connect two artifacts signed with different keys, there is no crash, and this
 * project has effectively no Android telemetry to notice with.
 *
 * Both artifacts are AABs today (Play refuses raw APKs for this application — see the
 * Fastfile), but the tool is chosen per file extension so an `.apk` still works:
 * `keytool -printcert -jarfile` reads a bundle, `apksigner` reads an APK. `apksigner`
 * cannot read an AAB at all, so this is a real dispatch, not a stylistic one.
 *
 * For a BUNDLE this doubles as the unsigned check. AGP names an unsigned bundle
 * `app-release.aab` — identical to a signed one, with no `-unsigned` suffix the way APKs
 * get — so the filename proves nothing. `keytool` prints "Not a signed jar file", which the
 * parser turns into a clear error.
 *
 * Usage:
 *   node scripts/check-android-signing-parity.mjs <phone artifact> <wear artifact>
 *
 * Exits 0 on parity (printing the shared fingerprint, which is also the value the
 * Digital Asset Links entry needs), non-zero on mismatch or on any failure to read
 * a fingerprint. The parsing lives in `scripts/lib/signing-fingerprints.mjs` (pure,
 * unit-tested); this file only resolves tools, runs them, prints and sets the code.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  compareBuildToolsVersionsDesc,
  compareSigningFingerprints,
  parseApksignerCertificateFingerprint,
  parseKeytoolCertificateFingerprint
} from './lib/signing-fingerprints.mjs';

const [phonePath, wearPath] = process.argv.slice(2);

const fail = (message) => {
  console.error(`[check-android-signing-parity] ${message}`);
  console.error('::error::Android signing parity check failed.');
  process.exit(1);
};

if (!phonePath || !wearPath) {
  fail('usage: check-android-signing-parity.mjs <phone artifact> <wear artifact>');
}
for (const [label, file] of [
  ['phone artifact', phonePath],
  ['Wear artifact', wearPath]
]) {
  if (!existsSync(file)) {
    fail(`${label} not found at ${file}. Nothing was uploaded.`);
  }
}

/**
 * Locate `apksigner`. It ships in build-tools, which is not on PATH on a GitHub
 * runner, and the installed build-tools version drifts with the runner image — so
 * resolve the newest installed one rather than pinning a version string here.
 */
const resolveApksigner = () => {
  const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  if (sdkRoot) {
    const buildTools = path.join(sdkRoot, 'build-tools');
    if (existsSync(buildTools)) {
      const candidates = readdirSync(buildTools)
        .sort(compareBuildToolsVersionsDesc)
        .map((version) => path.join(buildTools, version, 'apksigner'))
        .filter((candidate) => existsSync(candidate));
      if (candidates.length > 0) return candidates[0];
    }
  }
  // Fall back to PATH (local machines where build-tools is exported).
  return 'apksigner';
};

const run = (label, command, args) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join('\n').trim();
    fail(`${label} failed (${command}):\n${detail || error.message}`);
    return ''; // unreachable; keeps the type honest
  }
};

/** Read the signing certificate fingerprint, choosing the tool by artifact type. */
const fingerprintOf = (file) => {
  if (file.toLowerCase().endsWith('.apk')) {
    return parseApksignerCertificateFingerprint(
      run('apksigner verify', resolveApksigner(), ['verify', '--print-certs', file])
    );
  }
  return parseKeytoolCertificateFingerprint(
    run('keytool -printcert', 'keytool', ['-printcert', '-jarfile', file])
  );
};

let wearFingerprint;
let phoneFingerprint;
try {
  wearFingerprint = fingerprintOf(wearPath);
  phoneFingerprint = fingerprintOf(phonePath);
} catch (error) {
  fail(error.message);
}

const result = compareSigningFingerprints(
  { label: `Wear (${path.basename(wearPath)})`, fingerprint: wearFingerprint },
  { label: `phone (${path.basename(phonePath)})`, fingerprint: phoneFingerprint }
);

const writeSummary = (markdown) => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;
  try {
    appendFileSync(summaryFile, markdown);
  } catch {
    /* summary is best-effort */
  }
};

if (!result.match) {
  console.error(`[check-android-signing-parity] ${result.message}`);
  console.error('::error::Wear and phone artifacts are signed with different certificates.');
  writeSummary(
    '### ❌ Android signing parity\n\nThe Wear OS and phone artifacts are signed with **different** certificates. ' +
      'The Wearable Data Layer will not connect and Play will reject the form-factor association.\n'
  );
  process.exit(1);
}

console.log(`[check-android-signing-parity] OK — ${result.message}`);
// Echoed deliberately: this is the value the Digital Asset Links entry needs
// (watch-android/README.md § The three non-negotiable platform constraints, #3).
console.log(`[check-android-signing-parity] Signing certificate SHA-256: ${result.fingerprint}`);
writeSummary(
  '### ✅ Android signing parity\n\n' +
    'The Wear OS and phone artifacts share one signing certificate.\n\n' +
    `\`SHA-256: ${result.fingerprint}\`\n`
);
