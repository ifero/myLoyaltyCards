/* global console, process */

/**
 * Verify every native patch is actually APPLIED inside `node_modules` (Story 16.23).
 *
 * `patch-package` rewrites files in `node_modules`, which is not committed, is
 * rebuilt by every install, and is restored from cache in CI. That makes a patch
 * uniquely easy to lose in silence: delete `patches/`, drop `patch-package` from
 * the `postinstall` script, bump the patched package, or restore a `node_modules`
 * cache built before the patch existed — in every case the app quietly reverts
 * to upstream behaviour and nothing fails. The bug then returns looking brand
 * new, and the next investigation starts from scratch.
 *
 * So this gate deliberately does NOT check that the patch FILE exists. It checks
 * that the patched CODE is present in the installed package, which is the only
 * claim that matters. Run it after `yarn install`.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const patchesDir = path.join(repoRoot, 'patches');
const nodeModulesDir = path.join(repoRoot, 'node_modules');

const PATCH_SUFFIX = '.patch';

/**
 * One entry per patch file.
 *
 * `marker` must be a string the patch INTRODUCES — an identifier it adds, never
 * a line it merely moves or reformats. A marker that also exists upstream would
 * let this check pass against unpatched code, which is the one failure mode a
 * guard like this must not have.
 */
const EXPECTED_PATCHES = [
  {
    patchFile: `react-native-image-code-scanner+1.1.3${PATCH_SUFFIX}`,
    packageName: 'react-native-image-code-scanner',
    patchedFile: path.join('ios', 'ImageCodeScanner.swift'),
    marker: 'resampleFactors',
    reason:
      'Story 16.23 (AC7): appends downscaled variants to the iOS decoder retry ladder, ' +
      'so under-rasterised card artwork still decodes. Without it, small marginally-' +
      'rendered images silently fail to scan on iOS while succeeding on Android.'
  }
];

const failures = [];
const warnings = [];

// A verification gate must never pass vacuously — an absent dependency tree is a
// failure to verify, not a verified absence.
if (!existsSync(nodeModulesDir)) {
  console.error(
    '[verify-native-patches] node_modules is absent — run `yarn install` first.\n' +
      '  This gate inspects patched code INSIDE node_modules, so it cannot pass without it.'
  );
  process.exit(1);
}

// 1. The patch runner must still be wired into install. Without this, every patch
//    is inert and only the marker checks below would notice.
const rootPackageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const postinstallScript = rootPackageJson.scripts?.postinstall ?? '';

if (!postinstallScript.includes('patch-package')) {
  failures.push(
    'package.json `scripts.postinstall` no longer runs `patch-package`, so no patch in ' +
      'patches/ is applied on install. Restore it.'
  );
}

// 2. The registry above and the patches/ directory must agree in both directions:
//    an unregistered patch has no marker check, and a registered patch with no
//    file has nothing to apply.
const presentPatchFiles = existsSync(patchesDir)
  ? readdirSync(patchesDir)
      .filter((entry) => entry.endsWith(PATCH_SUFFIX))
      .sort()
  : [];
const registeredPatchFiles = EXPECTED_PATCHES.map((entry) => entry.patchFile).sort();

for (const patchFile of presentPatchFiles) {
  if (!registeredPatchFiles.includes(patchFile)) {
    failures.push(
      `patches/${patchFile} has no entry in EXPECTED_PATCHES (${path.relative(repoRoot, fileURLToPath(import.meta.url))}). ` +
        'Add one with a marker so the patch cannot later be dropped unnoticed.'
    );
  }
}

for (const patchFile of registeredPatchFiles) {
  if (!presentPatchFiles.includes(patchFile)) {
    failures.push(`patches/${patchFile} is registered but missing from patches/.`);
  }
}

// 3. The actual check: is the patched code present in the installed package?
for (const entry of EXPECTED_PATCHES) {
  const packageDir = path.join(nodeModulesDir, entry.packageName);
  const installedFile = path.join(packageDir, entry.patchedFile);

  if (!existsSync(installedFile)) {
    failures.push(
      `${entry.packageName}: expected patched file ${entry.patchedFile} is missing from node_modules. ` +
        'The package layout may have changed upstream — re-cut the patch.'
    );
    continue;
  }

  if (!readFileSync(installedFile, 'utf8').includes(entry.marker)) {
    failures.push(
      `${entry.packageName}/${entry.patchedFile} is NOT patched — marker \`${entry.marker}\` absent.\n` +
        `      Why it matters: ${entry.reason}\n` +
        '      Fix: `yarn install` (postinstall applies patches). If the patch no longer applies, ' +
        're-cut it with `npx patch-package ' +
        entry.packageName +
        '`.'
    );
  }

  // A version bump is not itself a failure — the patch may still apply cleanly —
  // but it is the moment to check whether upstream has fixed this, so the patch
  // can be dropped rather than carried forever.
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (existsSync(packageJsonPath)) {
    // patch-package names files `<package>+<version>.patch`, encoding a scoped
    // package as `@scope+name+version.patch` — so the version is whatever follows
    // the LAST `+`, never a fixed offset from the package name's length.
    const patchBasename = entry.patchFile.slice(0, -PATCH_SUFFIX.length);
    const declaredVersion = patchBasename.slice(patchBasename.lastIndexOf('+') + 1);
    const installedVersion = JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;

    if (declaredVersion !== installedVersion) {
      warnings.push(
        `${entry.packageName} is at ${installedVersion} but the patch is named for ${declaredVersion}. ` +
          'Check whether upstream has landed the fix; if so, drop the patch and this entry.'
      );
    }
  }
}

// An emptied registry must not read as success. The `patches/` cross-check above
// catches a patch FILE with no entry, but not the case where both the registry and
// the directory end up empty — a bad merge could clear the lot and this would
// print `OK — 0 native patch(es) verified` and exit 0.
if (EXPECTED_PATCHES.length === 0) {
  failures.push(
    'EXPECTED_PATCHES is empty — nothing was verified. A gate that checks nothing ' +
      'must not report success. If the last patch was genuinely removed on purpose, ' +
      'remove this gate from package.json, CI and pre-push in the same change.'
  );
}

for (const warning of warnings) {
  console.warn(`[verify-native-patches] WARNING: ${warning}`);
}

if (failures.length > 0) {
  console.error(`[verify-native-patches] ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  ✘ ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[verify-native-patches] OK — ${EXPECTED_PATCHES.length} native patch(es) verified as applied.`
);
