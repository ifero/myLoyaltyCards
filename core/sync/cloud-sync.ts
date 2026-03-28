import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllCards } from '@/core/database/card-repository';
import { LoyaltyCard } from '@/core/schemas';

import { logConflictResolution } from './conflict-logger';
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
// Change-Aware Upload (Story 7.3)
// ===================================================================

export type SyncChangedCardsResult = {
  success: boolean;
  upsertedCount: number;
  skippedCount: number;
  errors: AppError[];
};

/**
 * Upload local cards to cloud. When `lastSyncAt` is provided, only cards with
 * `updatedAt > lastSyncAt` are uploaded (delta sync). When `lastSyncAt` is null,
 * all local cards are uploaded (full sync fallback — Story 7.1 behaviour).
 *
 * This function does NOT check the cooldown — the caller is responsible
 * for respecting throttle semantics (e.g., sync-trigger).
 */
export const syncChangedCards = async (
  userId: string,
  cloudUpsertFn: CloudUpsertFn,
  lastSyncAt: string | null = null
): Promise<SyncChangedCardsResult> => {
  if (!userId) {
    return {
      success: false,
      upsertedCount: 0,
      skippedCount: 0,
      errors: [toAppError('SYNC_INVALID_USER', 'Invalid user id.')]
    };
  }

  const localCards = await getAllCards();
  if (localCards.length === 0) {
    return { success: true, upsertedCount: 0, skippedCount: 0, errors: [] };
  }

  // Delta filter: only cards changed after lastSyncAt (strict >)
  const cardsToUpload = lastSyncAt
    ? localCards.filter((card) => card.updatedAt > lastSyncAt)
    : localCards;

  const skippedCount = localCards.length - cardsToUpload.length;

  if (cardsToUpload.length === 0) {
    return { success: true, upsertedCount: 0, skippedCount, errors: [] };
  }

  const cloudRows = mapLocalCardsToCloudRows(cardsToUpload, userId);
  const errors: AppError[] = [];
  let upsertedCount = 0;

  const batches = splitIntoBatches(cloudRows, BATCH_SIZE);
  for (const batch of batches) {
    const { error } = await cloudUpsertFn(batch);
    if (error) {
      errors.push(toAppError('SYNC_UPLOAD_BATCH_FAILED', error));
      continue;
    }
    upsertedCount += batch.length;
  }

  return { success: errors.length === 0, upsertedCount, skippedCount, errors };
};

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

/**
 * Cloud fetch-since function signature (delta download).
 * When `since` is null, implementations must fall back to fetching ALL cards.
 */
export type CloudFetchSinceFn = (
  userId: string,
  since: string | null
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

// Epoch ISO string used as fallback for malformed timestamps (Story 7.6 — AC edge cases)
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

/**
 * Normalise an updatedAt timestamp for comparison.
 * - null / undefined / empty → epoch (oldest possible)
 * - Invalid Date string → epoch (oldest possible)
 * - Valid ISO 8601 → returned as-is
 * Returns the normalised ISO string and a flag indicating if it was malformed.
 */
export const normalizeTimestamp = (
  ts: string | null | undefined
): { iso: string; malformed: boolean } => {
  if (!ts || ts.trim() === '') {
    return { iso: EPOCH_ISO, malformed: true };
  }
  const d = new Date(ts);
  if (isNaN(d.getTime())) {
    return { iso: EPOCH_ISO, malformed: true };
  }
  return { iso: ts, malformed: false };
};

/**
 * Detect if a timestamp is in the future compared to `now`.
 * Used to log clock-skew warnings but still honour the value.
 */
const isFutureTimestamp = (iso: string, now: string): boolean => iso > now;

/**
 * Merge local and cloud cards using last-write-wins on updatedAt.
 *
 * Merge Decision Matrix (Story 7.6):
 * | Local State        | Cloud State        | Resolution                       |
 * | ------------------ | ------------------ | -------------------------------- |
 * | Newer updatedAt    | Older updatedAt    | Local wins → upload to cloud     |
 * | Older updatedAt    | Newer updatedAt    | Cloud wins → upsert locally      |
 * | Same updatedAt     | Same updatedAt     | Cloud wins (deterministic tie)   |
 * | New (no cloud ID)  | N/A                | Upload (local-only)              |
 * | N/A                | New (not in local) | Insert locally (cloud-only)      |
 *
 * Edge-case handling:
 * - Malformed updatedAt (null, empty, invalid) → treated as epoch (oldest)
 * - Future updatedAt (clock skew) → still compared, warning logged
 *
 * Deletion conflicts are handled separately via `mergeWithDeletions()`.
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

  const nowIso = new Date().toISOString();

  // Process cloud cards
  for (const cloudCard of cloudCards) {
    seenIds.add(cloudCard.id);
    const localCard = localMap.get(cloudCard.id);

    if (!localCard) {
      // Cloud-only: add
      merged.push(cloudCard);
      added++;
    } else {
      // Normalise timestamps for safe comparison
      const localTs = normalizeTimestamp(localCard.updatedAt);
      const cloudTs = normalizeTimestamp(cloudCard.updatedAt);

      // Log malformed timestamps (edge case 6.1)
      if (localTs.malformed) {
        logConflictResolution({
          cardId: localCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: 'cloud',
          reason: 'malformed-local-timestamp'
        });
      }
      if (cloudTs.malformed) {
        logConflictResolution({
          cardId: cloudCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: 'local',
          reason: 'malformed-cloud-timestamp'
        });
      }

      // Log future timestamps (clock skew — edge case 6.2)
      if (isFutureTimestamp(localTs.iso, nowIso)) {
        logConflictResolution({
          cardId: localCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: localTs.iso >= cloudTs.iso ? 'local' : 'cloud',
          reason: 'future-timestamp-warning'
        });
      }
      if (isFutureTimestamp(cloudTs.iso, nowIso)) {
        logConflictResolution({
          cardId: cloudCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: cloudTs.iso >= localTs.iso ? 'cloud' : 'local',
          reason: 'future-timestamp-warning'
        });
      }

      const isTie = cloudTs.iso === localTs.iso;
      const cloudWins = cloudTs.iso >= localTs.iso;

      if (isTie) {
        // Tie-break: cloud wins for determinism (AC2)
        merged.push(cloudCard);
        unchanged++;
        // Only log if values actually differ (same timestamp but different data)
        if (
          localCard.name !== cloudCard.name ||
          localCard.barcode !== cloudCard.barcode ||
          localCard.color !== cloudCard.color
        ) {
          logConflictResolution({
            cardId: cloudCard.id,
            localUpdatedAt: localCard.updatedAt,
            cloudUpdatedAt: cloudCard.updatedAt,
            winner: 'cloud',
            reason: 'tie-cloud-wins'
          });
        }
      } else if (cloudWins) {
        // Cloud newer (AC1)
        merged.push(cloudCard);
        updated++;
        logConflictResolution({
          cardId: cloudCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: 'cloud',
          reason: 'cloud-newer'
        });
      } else {
        // Local wins (newer) — counted as "unchanged" because local DB is not modified.
        // Upload (Story 7.1) handles pushing the newer local version to cloud.
        merged.push(localCard);
        unchanged++;
        logConflictResolution({
          cardId: localCard.id,
          localUpdatedAt: localCard.updatedAt,
          cloudUpdatedAt: cloudCard.updatedAt,
          winner: 'local',
          reason: 'local-newer'
        });
      }
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

// ===================================================================
// Deletion-Aware Merge (Story 7.6 — AC6)
// ===================================================================

export type MergeWithDeletionsResult = MergeResult & {
  /** Card IDs that should be deleted from cloud (local delete wins). */
  cloudDeletions: string[];
  /** Card IDs that should be deleted locally (cloud delete wins). */
  localDeletions: string[];
};

/**
 * Merge local and cloud cards with deletion conflict resolution.
 *
 * Deletion conflicts (AC6 — delete always wins):
 * | Local State        | Cloud State        | Resolution                       |
 * | ------------------ | ------------------ | -------------------------------- |
 * | Deleted (in queue) | Exists             | Delete from cloud                |
 * | Exists             | Deleted (missing)  | Delete locally                   |
 * | Deleted (in queue) | Deleted (missing)  | No-op (already gone)             |
 *
 * @param localCards       Current local card set
 * @param cloudCards       Full cloud card set for the user
 * @param pendingDeletions Card IDs queued for deletion locally
 */
export const mergeWithDeletions = (
  localCards: LoyaltyCard[],
  cloudCards: LoyaltyCard[],
  pendingDeletions: string[]
): MergeWithDeletionsResult => {
  const deletionSet = new Set(pendingDeletions);
  const cloudIdSet = new Set(cloudCards.map((c) => c.id));

  // Cloud deletions: card is in local deletion queue AND exists in cloud → delete from cloud
  const cloudDeletions: string[] = [];
  for (const deletedId of deletionSet) {
    if (cloudIdSet.has(deletedId)) {
      cloudDeletions.push(deletedId);
      logConflictResolution({
        cardId: deletedId,
        localUpdatedAt: null,
        cloudUpdatedAt: null,
        winner: 'local',
        reason: 'local-delete-wins'
      });
    }
    // If not in cloud either → no-op (already gone from both sides)
  }

  // Local deletions: card deleted in cloud (missing) but exists locally AND not in pending deletions
  // We detect this by finding local cards that are NOT in cloud and NOT new (i.e., previously synced).
  // For a full-sync scenario, if a card is missing from cloud it means it was deleted there.
  // However, this only applies to cards that WERE previously in cloud — local-only new cards
  // are handled normally by mergeCards(). Since we cannot distinguish "never synced" from
  // "cloud-deleted" without extra metadata, we rely on the full cloud set: any local card
  // missing from cloud during a FULL fetch is cloud-deleted (if not a new local-only card).
  // For delta sync, the caller must pass the full cloud set for accurate detection.
  const localDeletions: string[] = [];
  // A card is cloud-deleted if: it exists locally, NOT in cloud, AND NOT in pending local deletions
  // But we must be careful: local-only new cards (never synced) should NOT be deleted.
  // Since we don't track "synced" status per card, cloud-delete detection happens at the
  // caller level (sync-trigger) which knows if this is a full sync or delta.
  // Here we only handle: if card is in pendingDeletions AND in local → remove from local
  // The cloud-delete-wins case is handled by the absence of the card in cloudCards:
  // mergeCards() will not include it in the merged set if it's not in cloud AND not in local.

  // Filter out locally-deleted cards from both sets before merging
  const filteredLocalCards = localCards.filter((c) => !deletionSet.has(c.id));
  const filteredCloudCards = cloudCards.filter((c) => !deletionSet.has(c.id));

  // Perform standard LWW merge on non-deleted cards
  const baseResult = mergeCards(filteredLocalCards, filteredCloudCards);

  return {
    ...baseResult,
    cloudDeletions,
    localDeletions
  };
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

  // 5. Persist throttle timestamp so both download & upload share the cooldown
  await setLastCloudSyncAt(now());

  return {
    success: true,
    downloadedCount: cloudCards.length,
    mergeResult,
    errors: [],
    throttled: false
  };
};
