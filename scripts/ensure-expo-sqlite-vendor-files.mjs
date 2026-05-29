/* global console, process */

import { copyFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const expoSqliteRoot = path.join(repoRoot, 'node_modules', 'expo-sqlite');
const vendorRoot = path.join(expoSqliteRoot, 'vendor', 'sqlite3');
const iosRoot = path.join(expoSqliteRoot, 'ios');

const requiredFiles = ['sqlite3.c', 'sqlite3.h'];

if (!existsSync(expoSqliteRoot) || !existsSync(vendorRoot) || !existsSync(iosRoot)) {
  process.exit(0);
}

let restoredFiles = 0;

for (const fileName of requiredFiles) {
  const sourcePath = path.join(vendorRoot, fileName);
  const targetPath = path.join(iosRoot, fileName);

  if (!existsSync(sourcePath)) {
    console.warn(`[ensure-expo-sqlite-vendor-files] Missing source file: ${sourcePath}`);
    process.exitCode = 1;
    continue;
  }

  const targetExists = existsSync(targetPath);
  const targetHasContent = targetExists && statSync(targetPath).size > 0;

  if (targetHasContent) {
    continue;
  }

  copyFileSync(sourcePath, targetPath);
  restoredFiles += 1;
}

if (restoredFiles > 0) {
  console.log(`[ensure-expo-sqlite-vendor-files] Restored ${restoredFiles} ExpoSQLite vendored sqlite file(s).`);
}