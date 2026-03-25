import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllCards } from '@/core/database/card-repository';
import { LoyaltyCard } from '@/core/schemas';

import { mergeCards, syncChangedCards, type CloudFetchSinceFn } from './cloud-sync';
import { type CloudCardRow, cloudRowToLocalCard } from './mappers';
import { getLastSyncAt, setLastSyncAt } from './sync-timestamp';

const SYNC_DIRTY_KEY = 'syncDirty';

export type CloudUpsertFn = (rows: CloudCardRow[]) => Promise<{ error: string | null }>;
export type CloudDeleteFn = (cardId: string, userId: string) => Promise<{ error: string | null }>;
export type PersistMergedCardsFn = (cards: LoyaltyCard[]) => Promise<void>;

type ProcessPendingSyncResult = {
  success: boolean;
  downloadedCount: number;
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
 * Flush pending changes to the cloud using delta sync.
 *
 * Pipeline (Story 7.4):
 *   1. Read lastSyncAt
 *   2. Delta download (fetch cloud changes since lastSyncAt)
 *   3. Merge with local cards (last-write-wins)
 *   4. Persist merged cards locally
 *   5. Delta upload (push local changes since lastSyncAt)
 *   6. Process pending deletions (by ID, no timestamp filter)
 *   7. Update lastSyncAt to current timestamp (only on full success)
 *   8. Clear dirty flag and deletion queue
 *
 * First sync (null lastSyncAt): full sync → set lastSyncAt.
 *
 * @param userId               Authenticated user's ID
 * @param cloudUpsertFn        Dependency-injected upsert function
 * @param cloudDeleteFn        Dependency-injected delete function
 * @param cloudFetchSinceFn    Dependency-injected delta fetch function
 * @param persistMergedCardsFn Dependency-injected batch persist function
 * @param getPendingDeletions  Function to retrieve pending deletion IDs
 * @param clearPendingDeletionsFn Function to clear the deletion queue
 */
export const processPendingSync = async (
  userId: string,
  cloudUpsertFn: CloudUpsertFn,
  cloudDeleteFn: CloudDeleteFn,
  cloudFetchSinceFn: CloudFetchSinceFn,
  persistMergedCardsFn: PersistMergedCardsFn,
  getPendingDeletions: () => Promise<string[]>,
  clearPendingDeletionsFn: () => Promise<void>
): Promise<ProcessPendingSyncResult> => {
  const errors: string[] = [];
  let downloadedCount = 0;
  let upsertedCount = 0;
  let deletedCount = 0;

  if (!userId) {
    errors.push('Invalid user id.');
    return { success: false, downloadedCount, upsertedCount, deletedCount, errors };
  }

  // 1. Read lastSyncAt (null on first sync → full sync)
  const lastSyncAt = await getLastSyncAt();

  // 2. Delta download
  const { data: cloudRows, error: fetchError } = await cloudFetchSinceFn(userId, lastSyncAt);
  if (fetchError) {
    errors.push(`Download failed: ${fetchError}`);
    return { success: false, downloadedCount, upsertedCount, deletedCount, errors };
  }

  // 3. Map + merge with local cards
  const cloudCards: LoyaltyCard[] = [];
  for (const row of cloudRows) {
    const card = cloudRowToLocalCard(row);
    if (card) {
      cloudCards.push(card);
    }
  }
  downloadedCount = cloudCards.length;

  if (cloudCards.length > 0) {
    const localCards = await getAllCards();
    const { merged } = mergeCards(localCards, cloudCards);

    // 4. Persist merged cards locally
    await persistMergedCardsFn(merged);
  }

  // 5. Delta upload
  const upsertResult = await syncChangedCards(userId, cloudUpsertFn, lastSyncAt);
  upsertedCount = upsertResult.upsertedCount;
  if (!upsertResult.success) {
    for (const e of upsertResult.errors) {
      errors.push(`Upsert failed: ${e.message}`);
    }
  }

  // 6. Process pending deletions (by ID, no timestamp filter — AC7)
  const pendingIds = await getPendingDeletions();
  for (const cardId of pendingIds) {
    const { error } = await cloudDeleteFn(cardId, userId);
    if (error) {
      errors.push(`Delete failed for ${cardId}: ${error}`);
    } else {
      deletedCount++;
    }
  }

  // 7 + 8. Update lastSyncAt + clear dirty/deletions ONLY on full success (atomicity)
  if (errors.length === 0) {
    await setLastSyncAt(new Date().toISOString());
    await clearDirty();
    await clearPendingDeletionsFn();
  }

  console.log(
    `[sync] Delta sync: downloaded ${downloadedCount}, uploaded ${upsertedCount}, deleted ${deletedCount}`
  );

  return {
    success: errors.length === 0,
    downloadedCount,
    upsertedCount,
    deletedCount,
    errors
  };
};

export const _SYNC_DIRTY_KEY = SYNC_DIRTY_KEY;
