#!/usr/bin/env node
/**
 * Assert the Wear OS release APK is signed with the SAME certificate as the phone
 * release AAB, before either is uploaded to Play (Story 16.35, AC5).
 *
 * Why this gate exists: an *unsigned* APK fails loudly at Play, but a *wrong-key*
 * APK uploads cleanly and then breaks silently — the Wearable Data Layer refuses to
 * connect two artifacts signed with different keys, there is no crash, and this
 * project has effectively no Android telemetry to notice with.
 *
 * Usage:
 *   node scripts/check-android-signing-parity.mjs <phone.aab> <wear.apk>
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
  compareSigningFingerprints,
  parseApksignerCertificateFingerprint,
  parseKeytoolCertificateFingerprint
} from './lib/signing-fingerprints.mjs';

const [aabPath, apkPath] = process.argv.slice(2);

const fail = (message) => {
  console.error(`[check-android-signing-parity] ${message}`);
  console.error('::error::Android signing parity check failed.');
  process.exit(1);
};

if (!aabPath || !apkPath) {
  fail('usage: check-android-signing-parity.mjs <phone.aab> <wear.apk>');
}
for (const [label, file] of [
  ['phone AAB', aabPath],
  ['Wear APK', apkPath]
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
        .sort()
        .reverse()
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

const apksigner = resolveApksigner();

let wearFingerprint;
let phoneFingerprint;
try {
  wearFingerprint = parseApksignerCertificateFingerprint(
    run('apksigner verify', apksigner, ['verify', '--print-certs', apkPath])
  );
  phoneFingerprint = parseKeytoolCertificateFingerprint(
    run('keytool -printcert', 'keytool', ['-printcert', '-jarfile', aabPath])
  );
} catch (error) {
  fail(error.message);
}

const result = compareSigningFingerprints(
  { label: `Wear APK (${path.basename(apkPath)})`, fingerprint: wearFingerprint },
  { label: `phone AAB (${path.basename(aabPath)})`, fingerprint: phoneFingerprint }
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
  console.error('::error::Wear APK and phone AAB are signed with different certificates.');
  writeSummary(
    '### ❌ Android signing parity\n\nThe Wear OS APK and the phone AAB are signed with **different** certificates. ' +
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
    'The Wear OS APK and the phone AAB share one signing certificate.\n\n' +
    `\`SHA-256: ${result.fingerprint}\`\n`
);
