export {
  uploadLocalCards,
  forceSyncLocalCards,
  downloadCloudCards,
  mergeCards,
  mergeWithDeletions,
  normalizeTimestamp,
  syncChangedCards,
  _LAST_CLOUD_SYNC_KEY,
  _BATCH_SIZE,
  _CLOUD_SYNC_COOLDOWN_MS,
  type UploadLocalCardsResult,
  type DownloadCloudCardsResult,
  type SyncChangedCardsResult,
  type MergeResult,
  type MergeWithDeletionsResult,
  type CloudUpsertFn,
  type CloudFetchFn,
  type CloudFetchSinceFn,
  type AppError
} from './cloud-sync';

export { localCardToCloudRow, cloudRowToLocalCard, type CloudCardRow } from './mappers';

export {
  markDirty,
  isDirty,
  clearDirty,
  processPendingSync,
  _SYNC_DIRTY_KEY,
  type CloudDeleteFn,
  type PersistMergedCardsFn
} from './sync-trigger';

export {
  addPendingDeletion,
  getPendingDeletions,
  clearPendingDeletions,
  _PENDING_DELETIONS_KEY
} from './deletion-tracker';

export {
  getLastSyncAt,
  setLastSyncAt,
  clearLastSyncAt,
  _CLOUD_SYNC_LAST_SYNC_AT_KEY
} from './sync-timestamp';

export { retryWithBackoff } from './retry';

export {
  logConflictResolution,
  type ConflictLogEntry,
  type ConflictWinner,
  type ConflictReason
} from './conflict-logger';
