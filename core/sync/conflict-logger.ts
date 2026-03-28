/**
 * Conflict Logger — Story 7.6
 *
 * Dev-only logging for sync conflict resolution events.
 * Logs: cardId, localUpdatedAt, cloudUpdatedAt, winner, reason.
 * No production telemetry for MVP.
 */

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
 * Uses console.log — no production telemetry.
 */
export const logConflictResolution = (entry: ConflictLogEntry): void => {
  if (__DEV__) {
    console.log('[sync:conflict]', {
      cardId: entry.cardId,
      localUpdatedAt: entry.localUpdatedAt,
      cloudUpdatedAt: entry.cloudUpdatedAt,
      winner: entry.winner,
      reason: entry.reason
    });
  }
};
