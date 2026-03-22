/**
 * Guest Migration Service
 * Story 6.14: Upgrade Guest to Account
 *
 * Reads all locally stored loyalty cards from SQLite and upserts them
 * to the Supabase cloud backend under the authenticated user's account.
 *
 * This operation is idempotent — cards with the same `id` are upserted,
 * not duplicated. A SecureStore flag prevents re-running after success.
 *
 * The cloud upload function is injected (not imported) to maintain the
 * dependency boundary: core/ must not import from shared/.
 */

import { getAllCards } from '@/core/database/card-repository';
import { LoyaltyCard } from '@/core/schemas';
import { CloudCardRow, localCardToCloudRow } from '@/core/sync/mappers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIGRATION_FLAG_KEY = 'guestMigrationCompleted';
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MigrationResult =
  | { success: true; migratedCount: number }
  | { success: false; error: string; migratedCount: number };

/**
 * Injected cloud upsert function signature.
 * Returns `{ error: string | null }` — null on success.
 * The caller (features/ layer) provides a Supabase-based implementation;
 * tests provide a mock.
 */
export type CloudUpsertFn = (rows: CloudCardRow[]) => Promise<{ error: string | null }>;

// ---------------------------------------------------------------------------
// SecureStore lazy loader (same pattern as guest-session-repository)
// ---------------------------------------------------------------------------

const getSecureStore = (): typeof import('expo-secure-store') | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as typeof import('expo-secure-store');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// In-memory fallback (web / Jest)
// ---------------------------------------------------------------------------

let inMemoryMigrationFlag: string | null = null;

// ---------------------------------------------------------------------------
// Flag helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the migration has already been completed.
 */
export const isMigrationCompleted = async (): Promise<boolean> => {
  const store = getSecureStore();
  if (store) {
    try {
      const available = await store.isAvailableAsync();
      if (available) {
        const value = await store.getItemAsync(MIGRATION_FLAG_KEY);
        return value !== null;
      }
    } catch {
      // fall through to in-memory
    }
  }
  return inMemoryMigrationFlag !== null;
};

/**
 * Persist the migration-completed flag.
 */
const setMigrationFlag = async (userId: string): Promise<void> => {
  const payload = JSON.stringify({ completedAt: new Date().toISOString(), userId });
  const store = getSecureStore();
  if (store) {
    try {
      const available = await store.isAvailableAsync();
      if (available) {
        await store.setItemAsync(MIGRATION_FLAG_KEY, payload);
        return;
      }
    } catch {
      // fall through to in-memory
    }
  }
  inMemoryMigrationFlag = payload;
};

// ---------------------------------------------------------------------------
// Card → Cloud row mapper
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core migration function
// ---------------------------------------------------------------------------

/**
 * Migrate all local guest cards to the authenticated user's cloud account.
 *
 * - Reads all cards from local SQLite
 * - Uploads in batches of 50 via the injected `upsertFn`
 * - Sets `guestMigrationCompleted` flag in SecureStore on full success
 * - Returns partial progress on failure so caller can offer retry
 *
 * Idempotent: re-running upserts the same rows without creating duplicates.
 *
 * @param userId — Authenticated user's ID
 * @param upsertFn — Cloud upsert function (Supabase wrapper injected by caller)
 */
export const migrateGuestCardsToCloud = async (
  userId: string,
  upsertFn: CloudUpsertFn
): Promise<MigrationResult> => {
  // Validate userId
  if (!userId || typeof userId !== 'string') {
    return { success: false, error: 'Invalid user ID.', migratedCount: 0 };
  }

  let localCards: LoyaltyCard[];
  try {
    localCards = await getAllCards();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read local cards.';
    return { success: false, error: message, migratedCount: 0 };
  }

  // No cards — mark done immediately
  if (localCards.length === 0) {
    await setMigrationFlag(userId);
    return { success: true, migratedCount: 0 };
  }

  let totalMigrated = 0;

  // Upload in batches
  for (let i = 0; i < localCards.length; i += BATCH_SIZE) {
    const batch = localCards.slice(i, i + BATCH_SIZE);
    const cloudRows = batch.map((card) => localCardToCloudRow(card, userId));

    const { error } = await upsertFn(cloudRows);

    if (error) {
      return {
        success: false,
        error: error || 'Cloud upload failed.',
        migratedCount: totalMigrated
      };
    }

    totalMigrated += batch.length;
  }

  // All batches succeeded — persist flag
  await setMigrationFlag(userId);

  return { success: true, migratedCount: totalMigrated };
};

// ---------------------------------------------------------------------------
// Testing helpers
// ---------------------------------------------------------------------------

/** @internal Reset in-memory migration flag — for tests only. */
export const _resetMigrationFlagForTesting = (): void => {
  inMemoryMigrationFlag = null;
};

/** @internal Exposed for testing — the SecureStore key used for the flag. */
export const _MIGRATION_FLAG_KEY = MIGRATION_FLAG_KEY;

/** @internal Exposed for testing — batch size. */
export const _BATCH_SIZE = BATCH_SIZE;
