import { useCallback, useEffect, useRef, useState } from 'react';

import { batchUpsertCards } from '@/core/database/card-repository';
import { downloadCloudCards, forceSyncLocalCards, uploadLocalCards } from '@/core/sync';

import { getSession } from '@/shared/supabase/auth';
import { fetchCards, upsertCards } from '@/shared/supabase/cards';
import { useAuthState } from '@/shared/supabase/useAuthState';

export type UseCloudSyncResult = {
  isSyncing: boolean;
  syncError: string | null;
  downloadedCount: number;
  triggerSync: () => Promise<void>;
  forceSync: () => Promise<void>;
  clearSyncError: () => void;
};

const GENERIC_SYNC_ERROR = 'Cloud sync failed. Pull to retry.';
const DOWNLOAD_ERROR_MESSAGE =
  "Couldn't load your cloud cards. They'll sync when connectivity is restored.";

export const useCloudSync = (): UseCloudSyncResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const { authState, isAuthenticated } = useAuthState();
  const autoTriggeredRef = useRef(false);
  const isRunningRef = useRef(false);

  const runSync = useCallback(
    async (force: boolean) => {
      if (isRunningRef.current || !isAuthenticated) {
        return;
      }

      isRunningRef.current = true;
      setIsSyncing(true);
      setSyncError(null);
      setDownloadedCount(0);

      try {
        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.data) {
          const msg = sessionResult.success ? GENERIC_SYNC_ERROR : sessionResult.error.message;
          console.error(`[useCloudSync] Session retrieval failed: ${msg}`);
          setSyncError(msg);
          return;
        }

        const userId = sessionResult.data.user.id;

        // 1. Download cloud → merge with local
        const downloadResult = force
          ? await downloadCloudCards(userId, fetchCards, { forceSync: true })
          : await downloadCloudCards(userId, fetchCards);

        if (!downloadResult.success) {
          const firstError = downloadResult.errors[0]?.message ?? DOWNLOAD_ERROR_MESSAGE;
          setSyncError(firstError);
          return;
        }

        if (downloadResult.throttled) {
          // Download and upload share the same cooldown window — skip both
          return;
        }

        if (downloadResult.mergeResult) {
          setDownloadedCount(downloadResult.mergeResult.added + downloadResult.mergeResult.updated);

          // 2. Persist merged cards to local DB
          await batchUpsertCards(downloadResult.mergeResult.merged);
        }

        // 3. Upload local-only cards to cloud
        const uploadResult = force
          ? await forceSyncLocalCards(userId, upsertCards)
          : await uploadLocalCards(userId, upsertCards);

        if (!uploadResult.success) {
          const firstError = uploadResult.errors[0]?.message ?? GENERIC_SYNC_ERROR;
          setSyncError(firstError);
        }
      } catch {
        console.error('[useCloudSync] Sync failed unexpectedly');
        setSyncError(GENERIC_SYNC_ERROR);
      } finally {
        isRunningRef.current = false;
        setIsSyncing(false);
      }
    },
    [isAuthenticated]
  );

  const triggerSync = useCallback(async () => {
    await runSync(false);
  }, [runSync]);

  const forceSync = useCallback(async () => {
    await runSync(true);
  }, [runSync]);

  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  useEffect(() => {
    if (authState !== 'authenticated' || autoTriggeredRef.current) {
      return;
    }

    autoTriggeredRef.current = true;
    triggerSync();
  }, [authState, triggerSync]);

  useEffect(() => {
    if (authState === 'guest') {
      autoTriggeredRef.current = false;
    }
  }, [authState]);

  return {
    isSyncing,
    syncError,
    downloadedCount,
    triggerSync,
    forceSync,
    clearSyncError
  };
};
