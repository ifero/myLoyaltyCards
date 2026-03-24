import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { batchUpsertCards } from '@/core/database/card-repository';
import { isDirty, processPendingSync, type CloudDeleteFn } from '@/core/sync';
import { type CloudUpsertFn, type CloudFetchSinceFn } from '@/core/sync';
import { getPendingDeletions, clearPendingDeletions } from '@/core/sync';

import { getSession } from '@/shared/supabase/auth';
import { upsertCards, fetchCardsSince, deleteCardFromCloud } from '@/shared/supabase/cards';
import { useAuthState } from '@/shared/supabase/useAuthState';

const SYNC_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export type UseAutoSyncResult = {
  isSyncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
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
  const isRunningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = useCallback(async () => {
    if (isRunningRef.current || !isAuthenticated) {
      return;
    }

    try {
      // Only sync if there are dirty changes
      const dirty = await isDirty();
      if (!dirty) {
        return;
      }

      isRunningRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      const sessionResult = await getSession();
      if (!sessionResult.success || !sessionResult.data) {
        setSyncError('Session expired. Changes will sync after sign-in.');
        return;
      }

      const userId = sessionResult.data.user.id;
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
        const firstError = result.errors[0] ?? 'Sync failed';
        console.error(`[useAutoSync] Sync failed: ${firstError}`);
        setSyncError(String(firstError));
      }
    } catch {
      console.error('[useAutoSync] Unexpected sync error');
      setSyncError('Sync failed unexpectedly. Will retry.');
    } finally {
      isRunningRef.current = false;
      setIsSyncing(false);
    }
  }, [isAuthenticated, cloudUpsertFn, cloudDeleteFn, cloudFetchSinceFn]);

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
      runSync();
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
        runSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, runSync]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  return {
    isSyncing,
    syncError,
    clearSyncError
  };
};

export const _SYNC_CHECK_INTERVAL_MS = SYNC_CHECK_INTERVAL_MS;
