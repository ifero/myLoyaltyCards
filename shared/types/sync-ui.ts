/**
 * Shared types for sync UI components
 * Story 13.8: Restyle Sync & Status Indicators
 */

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export type SyncStatusPriority = 'error' | 'syncing' | 'offline' | 'success' | 'none';

export type ConflictCardData = {
  name: string;
  points?: number;
  barcodeTail: string;
  updatedAt: string;
  changedFields: string[];
};
