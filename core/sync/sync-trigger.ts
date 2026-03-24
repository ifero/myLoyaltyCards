import AsyncStorage from '@react-native-async-storage/async-storage';

import { syncChangedCards } from './cloud-sync';
import { type CloudCardRow } from './mappers';

const SYNC_DIRTY_KEY = 'syncDirty';

export type CloudUpsertFn = (rows: CloudCardRow[]) => Promise<{ error: string | null }>;
export type CloudDeleteFn = (cardId: string, userId: string) => Promise<{ error: string | null }>;

type ProcessPendingSyncResult = {
  success: boolean;
  upsertedCount: number;
  deletedCount: number;
  errors: string[];
};

/**
 * Mark local data as dirty — signals that card CRUD happened and a sync is needed.
 * Persisted to AsyncStorage so the flag survives app restarts.
 */
export const markDirty = async (): Promise<void> => {
  await AsyncStorage.setItem(SYNC_DIRTY_KEY, '1');
};

/**
 * Check whether local data has been marked dirty since the last sync.
 */
export const isDirty = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(SYNC_DIRTY_KEY);
  return value === '1';
};

/**
 * Clear the dirty flag — called after a successful sync flush.
 */
export const clearDirty = async (): Promise<void> => {
  await AsyncStorage.removeItem(SYNC_DIRTY_KEY);
};

/**
 * Flush pending changes to the cloud.
 *
 * 1. Reads all local cards and upserts them (full sync — delta is Story 7.4).
 * 2. Sends delete requests for any tracked pending deletions.
 * 3. Clears the dirty flag and deletion queue on success.
 *
 * @param userId             Authenticated user's ID
 * @param cloudUpsertFn      Dependency-injected upsert function
 * @param cloudDeleteFn      Dependency-injected delete function
 * @param getPendingDeletions Function to retrieve pending deletion IDs
 * @param clearPendingDeletions Function to clear the deletion queue
 */
export const processPendingSync = async (
  userId: string,
  cloudUpsertFn: CloudUpsertFn,
  cloudDeleteFn: CloudDeleteFn,
  getPendingDeletions: () => Promise<string[]>,
  clearPendingDeletions: () => Promise<void>
): Promise<ProcessPendingSyncResult> => {
  const errors: string[] = [];
  let upsertedCount = 0;
  let deletedCount = 0;

  // 1. Upsert all local cards via syncChangedCards (Story 7.3 / Task 2)
  const upsertResult = await syncChangedCards(userId, cloudUpsertFn);
  if (!upsertResult.success) {
    for (const e of upsertResult.errors) {
      errors.push(`Upsert failed: ${e.message}`);
    }
  } else {
    upsertedCount = upsertResult.upsertedCount;
  }

  // 2. Process pending deletions
  const pendingIds = await getPendingDeletions();
  for (const cardId of pendingIds) {
    const { error } = await cloudDeleteFn(cardId, userId);
    if (error) {
      errors.push(`Delete failed for ${cardId}: ${error}`);
    } else {
      deletedCount++;
    }
  }

  // 3. Clear dirty flag + deletion queue on full success
  if (errors.length === 0) {
    await clearDirty();
    await clearPendingDeletions();
  }

  return {
    success: errors.length === 0,
    upsertedCount,
    deletedCount,
    errors
  };
};

export const _SYNC_DIRTY_KEY = SYNC_DIRTY_KEY;
