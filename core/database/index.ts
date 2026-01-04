/**
 * Database Module Exports
 * Story 1.4: Set Up Local Database
 *
 * Central export point for all database-related functionality.
 */

// Database initialization and access
export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  resetDatabaseSingleton,
} from './database';

// Migration utilities
export { DB_VERSION, DB_NAME, getDbVersion, setDbVersion } from './migrations';

// Card repository operations
export {
  getAllCards,
  getCardById,
  insertCard,
  updateCard,
  deleteCard,
  upsertCard,
  deleteAllCards,
  getCardCount,
} from './card-repository';
