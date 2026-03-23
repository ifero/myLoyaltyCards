import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllCards } from '@/core/database/card-repository';
import { LoyaltyCard } from '@/core/schemas';

import { CloudCardRow, cloudRowToLocalCard, localCardToCloudRow } from './mappers';

const LAST_CLOUD_SYNC_KEY = 'lastCloudSync';
const CLOUD_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const BATCH_SIZE = 50;

export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Cloud upsert function signature.
 * Contract: Implementations MUST validate rows (e.g., via Zod schema)
 * before sending to the cloud backend. See `upsertCards` in
 * `shared/supabase/cards.ts` which validates via `parseWithLogging`.
 */
export type CloudUpsertFn = (rows: CloudCardRow[]) => Promise<{ error: string | null }>;

export type UploadLocalCardsResult = {
  success: boolean;
  uploadedCount: number;
  failedCount: number;
  errors: AppError[];
  throttled: boolean;
};

type UploadLocalCardsOptions = {
  forceSync?: boolean;
  now?: () => number;
};

const toAppError = (code: string, message: string, details?: unknown): AppError => ({
  code,
  message,
  details
});

const splitIntoBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
};

const getLastCloudSyncAt = async (): Promise<number | null> => {
  const raw = await AsyncStorage.getItem(LAST_CLOUD_SYNC_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const setLastCloudSyncAt = async (timestampMs: number): Promise<void> => {
  await AsyncStorage.setItem(LAST_CLOUD_SYNC_KEY, String(timestampMs));
};

const mapLocalCardsToCloudRows = (cards: LoyaltyCard[], userId: string): CloudCardRow[] => {
  return cards.map((card) => localCardToCloudRow(card, userId));
};

export const uploadLocalCards = async (
  userId: string,
  cloudUpsertFn: CloudUpsertFn,
  options: UploadLocalCardsOptions = {}
): Promise<UploadLocalCardsResult> => {
  if (!userId) {
    console.error('[cloud-sync] uploadLocalCards: invalid userId');
    return {
      success: false,
      uploadedCount: 0,
      failedCount: 0,
      errors: [toAppError('SYNC_INVALID_USER', 'Invalid user id.')],
      throttled: false
    };
  }

  const now = options.now ?? Date.now;
  const forceSync = options.forceSync ?? false;

  if (!forceSync) {
    const lastSyncAt = await getLastCloudSyncAt();
    if (lastSyncAt !== null && now() - lastSyncAt < CLOUD_SYNC_COOLDOWN_MS) {
      return {
        success: true,
        uploadedCount: 0,
        failedCount: 0,
        errors: [],
        throttled: true
      };
    }
  }

  const localCards = await getAllCards();
  if (localCards.length === 0) {
    await setLastCloudSyncAt(now());
    return {
      success: true,
      uploadedCount: 0,
      failedCount: 0,
      errors: [],
      throttled: false
    };
  }

  const cloudRows = mapLocalCardsToCloudRows(localCards, userId);
  let uploadedCount = 0;
  let failedCount = 0;
  const errors: AppError[] = [];

  const batches = splitIntoBatches(cloudRows, BATCH_SIZE);
  for (const batch of batches) {
    const { error } = await cloudUpsertFn(batch);
    if (error) {
      console.error(`[cloud-sync] Batch upload failed: ${error}`);
      failedCount += batch.length;
      errors.push(toAppError('SYNC_UPLOAD_BATCH_FAILED', error));
      continue;
    }
    uploadedCount += batch.length;
  }

  if (errors.length === 0) {
    await setLastCloudSyncAt(now());
  }

  return {
    success: errors.length === 0,
    uploadedCount,
    failedCount,
    errors,
    throttled: false
  };
};

export const forceSyncLocalCards = async (
  userId: string,
  cloudUpsertFn: CloudUpsertFn,
  options: Omit<UploadLocalCardsOptions, 'forceSync'> = {}
): Promise<UploadLocalCardsResult> => {
  return uploadLocalCards(userId, cloudUpsertFn, { ...options, forceSync: true });
};

export const _LAST_CLOUD_SYNC_KEY = LAST_CLOUD_SYNC_KEY;
export const _BATCH_SIZE = BATCH_SIZE;
export const _CLOUD_SYNC_COOLDOWN_MS = CLOUD_SYNC_COOLDOWN_MS;

// ===================================================================
// Download & Merge (Story 7.2)
// ===================================================================

/**
 * Cloud fetch function signature.
 * Implementations return cloud rows for the given user.
 */
export type CloudFetchFn = (
  userId: string
) => Promise<{ data: CloudCardRow[]; error: string | null }>;

export type MergeResult = {
  merged: LoyaltyCard[];
  added: number;
  updated: number;
  unchanged: number;
  skipped: number;
};

export type DownloadCloudCardsResult = {
  success: boolean;
  downloadedCount: number;
  mergeResult: MergeResult | null;
  errors: AppError[];
  throttled: boolean;
};

type DownloadCloudCardsOptions = {
  forceSync?: boolean;
  now?: () => number;
};

/**
 * Merge local and cloud cards using last-write-wins on updatedAt.
 *
 * - Duplicate IDs: keep the card with the latest `updatedAt` (ISO 8601 lexicographic).
 * - Cloud-only cards: added to the merged set.
 * - Local-only cards: kept as-is (upload handles pushing them to cloud).
 * - Tie-break (identical `updatedAt`): cloud wins for determinism.
 */
export const mergeCards = (localCards: LoyaltyCard[], cloudCards: LoyaltyCard[]): MergeResult => {
  const localMap = new Map<string, LoyaltyCard>();
  for (const card of localCards) {
    localMap.set(card.id, card);
  }

  const merged: LoyaltyCard[] = [];
  const seenIds = new Set<string>();
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  // Process cloud cards
  for (const cloudCard of cloudCards) {
    seenIds.add(cloudCard.id);
    const localCard = localMap.get(cloudCard.id);

    if (!localCard) {
      // Cloud-only: add
      merged.push(cloudCard);
      added++;
    } else if (cloudCard.updatedAt >= localCard.updatedAt) {
      // Cloud wins (newer or tie-break)
      merged.push(cloudCard);
      updated += cloudCard.updatedAt === localCard.updatedAt ? 0 : 1;
      unchanged += cloudCard.updatedAt === localCard.updatedAt ? 1 : 0;
    } else {
      // Local wins (newer)
      merged.push(localCard);
      unchanged++;
    }
  }

  // Add local-only cards (not in cloud)
  for (const localCard of localCards) {
    if (!seenIds.has(localCard.id)) {
      merged.push(localCard);
      unchanged++;
    }
  }

  return { merged, added, updated, unchanged, skipped: 0 };
};

/**
 * Download cloud cards, map them, merge with local cards.
 * Respects sync throttle (reuses the same LAST_CLOUD_SYNC_KEY from upload).
 */
export const downloadCloudCards = async (
  userId: string,
  cloudFetchFn: CloudFetchFn,
  options: DownloadCloudCardsOptions = {}
): Promise<DownloadCloudCardsResult> => {
  if (!userId) {
    console.error('[cloud-sync] downloadCloudCards: invalid userId');
    return {
      success: false,
      downloadedCount: 0,
      mergeResult: null,
      errors: [toAppError('SYNC_INVALID_USER', 'Invalid user id.')],
      throttled: false
    };
  }

  const now = options.now ?? Date.now;
  const forceSync = options.forceSync ?? false;

  if (!forceSync) {
    const lastSyncAt = await getLastCloudSyncAt();
    if (lastSyncAt !== null && now() - lastSyncAt < CLOUD_SYNC_COOLDOWN_MS) {
      return {
        success: true,
        downloadedCount: 0,
        mergeResult: null,
        errors: [],
        throttled: true
      };
    }
  }

  // 1. Fetch from cloud
  const { data: cloudRows, error: fetchError } = await cloudFetchFn(userId);
  if (fetchError) {
    console.error(`[cloud-sync] Cloud fetch failed: ${fetchError}`);
    return {
      success: false,
      downloadedCount: 0,
      mergeResult: null,
      errors: [toAppError('SYNC_DOWNLOAD_FETCH_FAILED', fetchError)],
      throttled: false
    };
  }

  // 2. Map cloud rows → local cards (skip invalid)
  let skipped = 0;
  const cloudCards: LoyaltyCard[] = [];
  for (const row of cloudRows) {
    const card = cloudRowToLocalCard(row);
    if (card) {
      cloudCards.push(card);
    } else {
      skipped++;
      console.error(`[cloud-sync] Skipping invalid cloud row id=${row.id}`);
    }
  }

  // 3. Get local cards
  const localCards = await getAllCards();

  // 4. Merge
  const mergeResult = mergeCards(localCards, cloudCards);
  mergeResult.skipped = skipped;

  return {
    success: true,
    downloadedCount: cloudCards.length,
    mergeResult,
    errors: [],
    throttled: false
  };
};
