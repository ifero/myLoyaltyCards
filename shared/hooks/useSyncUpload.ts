import { useCallback, useEffect, useRef, useState } from 'react';

import { forceSyncLocalCards, uploadLocalCards } from '@/core/sync';

import { getSession } from '@/shared/supabase/auth';
import { upsertCards } from '@/shared/supabase/cards';
import { useAuthState } from '@/shared/supabase/useAuthState';

export type UseSyncUploadResult = {
  isSyncing: boolean;
  syncError: string | null;
  triggerSync: () => Promise<void>;
  forceSync: () => Promise<void>;
  clearSyncError: () => void;
};

const GENERIC_SYNC_ERROR = 'Cloud sync failed. Pull to retry.';

export const useSyncUpload = (): UseSyncUploadResult => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
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

      try {
        const sessionResult = await getSession();
        if (!sessionResult.success || !sessionResult.data) {
          const msg = sessionResult.success ? GENERIC_SYNC_ERROR : sessionResult.error.message;
          console.error(`[useSyncUpload] Session retrieval failed: ${msg}`);
          setSyncError(msg);
          return;
        }

        const userId = sessionResult.data.user.id;
        const result = force
          ? await forceSyncLocalCards(userId, upsertCards)
          : await uploadLocalCards(userId, upsertCards);

        if (!result.success) {
          const firstError = result.errors[0]?.message ?? GENERIC_SYNC_ERROR;
          setSyncError(firstError);
        }
      } catch {
        console.error('[useSyncUpload] Sync failed unexpectedly');
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
    triggerSync,
    forceSync,
    clearSyncError
  };
};
