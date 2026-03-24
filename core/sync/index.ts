export {
  uploadLocalCards,
  forceSyncLocalCards,
  downloadCloudCards,
  mergeCards,
  syncChangedCards,
  _LAST_CLOUD_SYNC_KEY,
  _BATCH_SIZE,
  _CLOUD_SYNC_COOLDOWN_MS,
  type UploadLocalCardsResult,
  type DownloadCloudCardsResult,
  type SyncChangedCardsResult,
  type MergeResult,
  type CloudUpsertFn,
  type CloudFetchFn,
  type AppError
} from './cloud-sync';

export { localCardToCloudRow, cloudRowToLocalCard, type CloudCardRow } from './mappers';

export {
  markDirty,
  isDirty,
  clearDirty,
  processPendingSync,
  _SYNC_DIRTY_KEY,
  type CloudDeleteFn
} from './sync-trigger';

export {
  addPendingDeletion,
  getPendingDeletions,
  clearPendingDeletions,
  _PENDING_DELETIONS_KEY
} from './deletion-tracker';
