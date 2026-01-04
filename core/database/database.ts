/**
 * Database Module
 * Story 1.4: Set Up Local Database
 *
 * Provides database initialization and singleton access.
 * Uses expo-sqlite for local SQLite database.
 */

import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';

import { DB_NAME, runMigrations } from './migrations';

/**
 * Database singleton instance
 */
let db: SQLiteDatabase | null = null;

/**
 * Flag to track initialization state
 */
let isInitializing = false;

/**
 * Promise for pending initialization
 */
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * Initialize the database
 * Creates the database file and runs migrations
 * Returns a singleton instance
 */
export async function initializeDatabase(): Promise<SQLiteDatabase> {
  // Return existing instance if available
  if (db) {
    return db;
  }

  // Return pending initialization promise if already initializing
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start initialization
  isInitializing = true;

  initPromise = (async () => {
    try {
      // Open the database
      const database = await openDatabaseAsync(DB_NAME);

      // Enable WAL mode for better performance
      await database.execAsync('PRAGMA journal_mode = WAL');

      // Enable foreign keys
      await database.execAsync('PRAGMA foreign_keys = ON');

      // Run migrations
      await runMigrations(database);

      // Store singleton
      db = database;

      return database;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Get the database instance
 * Throws if database is not initialized
 */
export function getDatabase(): SQLiteDatabase {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return db;
}

/**
 * Close the database connection
 * Used for testing or cleanup
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    isInitializing = false;
    initPromise = null;
  }
}

/**
 * Reset the database singleton
 * Used for testing purposes only
 */
export function resetDatabaseSingleton(): void {
  db = null;
  isInitializing = false;
  initPromise = null;
}
