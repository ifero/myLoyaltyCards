/**
 * Database Migrations Module
 * Story 1.4: Set Up Local Database
 *
 * Handles database version tracking and migration logic.
 * Supports both fresh installs and upgrades.
 */

import { SQLiteDatabase } from 'expo-sqlite';

/**
 * Current database version
 * Increment this when adding new migrations
 */
export const DB_VERSION = 1;

/**
 * Database name
 */
export const DB_NAME = 'myloyaltycards.db';

/**
 * Get the current database version from user_version pragma
 * Returns 0 if not set (fresh install)
 */
export async function getDbVersion(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  return result?.user_version ?? 0;
}

/**
 * Set the database version using user_version pragma
 */
export async function setDbVersion(
  db: SQLiteDatabase,
  version: number
): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}

/**
 * Create the current schema for fresh installs
 * This creates all tables at the current version
 */
async function createCurrentSchema(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS loyalty_cards (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      barcode TEXT NOT NULL,
      barcode_format TEXT NOT NULL,
      brand_id TEXT,
      color TEXT NOT NULL,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_loyalty_cards_created_at 
      ON loyalty_cards(created_at);
    CREATE INDEX IF NOT EXISTS idx_loyalty_cards_usage 
      ON loyalty_cards(usage_count, last_used_at);
    CREATE INDEX IF NOT EXISTS idx_loyalty_cards_favorite 
      ON loyalty_cards(is_favorite);
  `);
}

/**
 * Migration from version 0 to version 1
 * This is the initial schema creation
 */
async function migrateV0toV1(db: SQLiteDatabase): Promise<void> {
  await createCurrentSchema(db);
}

/**
 * Initialize the database with migrations
 * Handles both fresh installs and upgrades
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getDbVersion(db);

  // Fresh install: Create current schema directly
  if (currentVersion === 0) {
    await createCurrentSchema(db);
    await setDbVersion(db, DB_VERSION);
    return;
  }

  // Upgrade path: Run incremental migrations
  if (currentVersion < 1) {
    await migrateV0toV1(db);
  }

  // Add future migrations here:
  // if (currentVersion < 2) {
  //   await migrateV1toV2(db);
  // }

  await setDbVersion(db, DB_VERSION);
}
