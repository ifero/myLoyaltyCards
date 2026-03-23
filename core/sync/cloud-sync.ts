import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllCards } from '@/core/database/card-repository';
import { LoyaltyCard } from '@/core/schemas';

import { CloudCardRow, localCardToCloudRow } from './mappers';

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
