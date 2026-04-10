/**
 * SyncStatusContainer — orchestrator for sync status strips
 * Story 13.8: Restyle Sync & Status Indicators (AC6, AC7)
 *
 * Renders exactly ONE status strip at a time based on priority:
 *   error > syncing > offline > success > none
 *
 * Positioned above the card grid, below the header.
 * Uses AnimatePresence-style layout (FadeIn / FadeOut from reanimated).
 */
import { OfflineIndicator } from '@/shared/components/OfflineIndicator';
import { SyncErrorBanner } from '@/shared/components/SyncErrorBanner';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import type { SyncState, SyncStatusPriority } from '@/shared/types/sync-ui';

type SyncStatusContainerProps = {
  syncState: SyncState;
  syncErrorMessage: string | null;
  isOffline: boolean;
  pendingChangeCount: number;
  onRetrySync: () => void;
  onDismissError: () => void;
  onSuccessDismissed: () => void;
};

/**
 * Determine the highest-priority status to display.
 */
const resolvePriority = (
  syncState: SyncState,
  syncErrorMessage: string | null,
  isOffline: boolean,
  pendingChangeCount: number
): SyncStatusPriority => {
  if (syncErrorMessage) return 'error';
  if (syncState === 'syncing') return 'syncing';
  if (isOffline && pendingChangeCount > 0) return 'offline';
  if (syncState === 'success') return 'success';
  return 'none';
};

export const SyncStatusContainer = ({
  syncState,
  syncErrorMessage,
  isOffline,
  pendingChangeCount,
  onRetrySync,
  onDismissError,
  onSuccessDismissed
}: SyncStatusContainerProps) => {
  const priority = resolvePriority(syncState, syncErrorMessage, isOffline, pendingChangeCount);

  switch (priority) {
    case 'error':
      return (
        <SyncErrorBanner
          message={syncErrorMessage}
          onRetry={onRetrySync}
          onDismiss={onDismissError}
        />
      );
    case 'syncing':
      return <SyncIndicator syncState="syncing" />;
    case 'offline':
      return <OfflineIndicator isOffline pendingChangeCount={pendingChangeCount} />;
    case 'success':
      return <SyncIndicator syncState="success" onSuccessDismissed={onSuccessDismissed} />;
    case 'none':
    default:
      return null;
  }
};

// Export for testing
export { resolvePriority };
