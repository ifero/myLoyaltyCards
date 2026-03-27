import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { batchUpsertCards } from '@/core/database/card-repository';
import { isDirty, processPendingSync, retryWithBackoff, type CloudDeleteFn } from '@/core/sync';
import { type CloudUpsertFn, type CloudFetchSinceFn } from '@/core/sync';
import { getPendingDeletions, clearPendingDeletions } from '@/core/sync';

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { getSession } from '@/shared/supabase/auth';
import { upsertCards, fetchCardsSince, deleteCardFromCloud } from '@/shared/supabase/cards';
import { useAuthState } from '@/shared/supabase/useAuthState';

const SYNC_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const RECONNECT_DEBOUNCE_MS = 1000;
const MAX_RETRIES_EXCEEDED_MESSAGE = 'Sync failed. Changes saved locally.';

export type UseAutoSyncResult = {
  isSyncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  retrySync: () => Promise<void>;
};

/**
 * Hook that watches for dirty state + throttle window expiry,
 * and triggers background sync when conditions are met.
 *
 * Also listens for AppState changes to trigger sync when the app
 * returns to the foreground.
 */
export const useAutoSync = (
  cloudUpsertFn: CloudUpsertFn = upsertCards,
  cloudDeleteFn: CloudDeleteFn = deleteCardFromCloud,
  cloudFetchSinceFn: CloudFetchSinceFn = fetchCardsSince
): UseAutoSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthState();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isRunningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousConnectedRef = useRef<boolean | null>(null);
  const lastSyncStartedAtRef = useRef(0);

  const runSync = useCallback(
    async (force = false) => {
      if (isRunningRef.current || !isAuthenticated) {
        return;
      }

      if (!isConnected || !isInternetReachable) {
        return;
      }

      if (!force && Date.now() - lastSyncStartedAtRef.current < SYNC_CHECK_INTERVAL_MS) {
        return;
      }

      try {
        // Only sync if there are dirty changes
        const dirty = await isDirty();
        if (!dirty) {
          return;
        }

        isRunningRef.current = true;
        lastSyncStartedAtRef.current = Date.now();
        setIsSyncing(true);
        setSyncError(null);

        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.data) {
          setSyncError('Session expired. Changes will sync after sign-in.');
          return;
        }

        const userId = sessionResult.data.user.id;
        await retryWithBackoff(
          async () => {
            const result = await processPendingSync(
              userId,
              cloudUpsertFn,
              cloudDeleteFn,
              cloudFetchSinceFn,
              batchUpsertCards,
              getPendingDeletions,
              clearPendingDeletions
            );

            if (!result.success) {
              throw new Error(result.errors[0] ?? 'Sync failed');
            }
          },
          {
            maxRetries: 3,
            baseDelay: 1000,
            onRetry: (attempt, delayMs, error) => {
              console.log(`[useAutoSync] Retry ${attempt}/3 in ${delayMs}ms`, error);
            }
          }
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message.includes('Sync failed')
            ? MAX_RETRIES_EXCEEDED_MESSAGE
            : 'An unexpected error occurred. Changes saved locally.';
        console.error('[useAutoSync] Sync error:', error);
        setSyncError(message);
      } finally {
        isRunningRef.current = false;
        setIsSyncing(false);
      }
    },
    [
      isAuthenticated,
      isConnected,
      isInternetReachable,
      cloudUpsertFn,
      cloudDeleteFn,
      cloudFetchSinceFn
    ]
  );

  // Periodic interval check
  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      runSync(false);
    }, SYNC_CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, runSync]);

  // AppState listener — trigger sync when returning to foreground
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        runSync(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, runSync]);

  // Reconnect trigger — sync when transitioning from offline → online
  useEffect(() => {
    if (!isAuthenticated) {
      previousConnectedRef.current = null;
      return;
    }

    const previousConnected = previousConnectedRef.current;
    const currentlyConnected = isConnected && isInternetReachable;

    if (previousConnected === false && currentlyConnected) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        runSync(false);
      }, RECONNECT_DEBOUNCE_MS);
    }

    previousConnectedRef.current = currentlyConnected;
  }, [isAuthenticated, isConnected, isInternetReachable, runSync]);

  // Cleanup reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  const retrySync = useCallback(async () => {
    await runSync(true);
  }, [runSync]);

  return {
    isSyncing,
    syncError,
    clearSyncError,
    retrySync
  };
};

export const _SYNC_CHECK_INTERVAL_MS = SYNC_CHECK_INTERVAL_MS;
export const _RECONNECT_DEBOUNCE_MS = RECONNECT_DEBOUNCE_MS;
