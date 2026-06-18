/**
 * Conflict Logger — Story 7.6
 *
 * Dev-only logging for sync conflict resolution events.
 * Logs: cardId, localUpdatedAt, cloudUpdatedAt, winner, reason.
 * No production telemetry for MVP.
 */

import { logger } from '@/core/utils/logger';

export type ConflictWinner = 'local' | 'cloud';

export type ConflictReason =
  | 'local-newer'
  | 'cloud-newer'
  | 'tie-cloud-wins'
  | 'local-delete-wins'
  | 'cloud-delete-wins'
  | 'malformed-local-timestamp'
  | 'malformed-cloud-timestamp'
  | 'future-timestamp-warning';

export type ConflictLogEntry = {
  cardId: string;
  localUpdatedAt: string | null;
  cloudUpdatedAt: string | null;
  winner: ConflictWinner;
  reason: ConflictReason;
};

/**
 * Log a sync conflict resolution event (dev-only).
 * Routed through `logger.info`, which only logs in development — so this stays
 * out of production telemetry while keeping the convention consistent.
 */
export const logConflictResolution = (entry: ConflictLogEntry): void => {
  logger.info('[sync:conflict]', {
    cardId: entry.cardId,
    localUpdatedAt: entry.localUpdatedAt,
    cloudUpdatedAt: entry.cloudUpdatedAt,
    winner: entry.winner,
    reason: entry.reason
  });
};
