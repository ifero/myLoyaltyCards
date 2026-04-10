/**
 * Home Screen
 * Story 2.1: Display Card List
 * Story 13.8: SyncStatusContainer integration
 *
 * Main screen displaying the card list grid or empty state.
 * Uses SyncStatusContainer for unified sync strip rendering.
 */

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { SyncStatusContainer } from '@/shared/components/SyncStatusContainer';
import { useAutoSync } from '@/shared/hooks/useAutoSync';
import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useAuthState } from '@/shared/supabase/useAuthState';
import type { SyncState } from '@/shared/types/sync-ui';

import { GuestModeBanner } from '@/features/auth/components';
import MigrationBanner from '@/features/auth/MigrationBanner';
import { useGuestMigration } from '@/features/auth/useGuestMigration';
import { CardList, useCards } from '@/features/cards';

const HomeScreen = () => {
  const { cards } = useCards();
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const { newCardId } = useLocalSearchParams<{ newCardId?: string }>();
  const { authState } = useAuthState();
  const { status, message, retry, dismiss } = useGuestMigration();
  const { isSyncing, syncError, forceSync, clearSyncError } = useCloudSync();
  const {
    isSyncing: isAutoSyncing,
    syncError: autoSyncError,
    clearSyncError: clearAutoSyncError,
    retrySync
  } = useAutoSync();
  const { isConnected, isInternetReachable } = useNetworkStatus();

  const anySyncing = isSyncing || isAutoSyncing;
  const combinedError = syncError ?? autoSyncError ?? null;
  const isOffline = !isConnected || !isInternetReachable;

  // Derive SyncState for the SyncStatusContainer
  const syncState: SyncState = anySyncing
    ? 'syncing'
    : showSuccess
      ? 'success'
      : combinedError
        ? 'error'
        : 'idle';

  // Track transition from syncing → idle to show success
  const [wasSyncing, setWasSyncing] = useState(false);
  useEffect(() => {
    if (anySyncing) {
      setWasSyncing(true);
    } else if (wasSyncing && !combinedError) {
      setShowSuccess(true);
      setWasSyncing(false);
    } else {
      setWasSyncing(false);
    }
  }, [anySyncing, combinedError, wasSyncing]);

  const handleSuccessDismissed = useCallback(() => {
    setShowSuccess(false);
  }, []);

  const handleRetrySync = useCallback(async () => {
    await forceSync();
    await retrySync();
  }, [forceSync, retrySync]);

  const handleDismissError = useCallback(() => {
    clearSyncError();
    clearAutoSyncError();
  }, [clearSyncError, clearAutoSyncError]);

  useEffect(() => {
    if (typeof newCardId === 'string' && newCardId.length > 0) {
      setHighlightCardId(newCardId);
      router.replace('/');
    }
  }, [newCardId, router]);

  return (
    <>
      <GuestModeBanner isGuestMode={authState === 'guest' && cards.length > 4} />
      <MigrationBanner status={status} message={message} onRetry={retry} onDismiss={dismiss} />
      <SyncStatusContainer
        syncState={syncState}
        syncErrorMessage={combinedError}
        isOffline={isOffline}
        pendingChangeCount={0}
        onRetrySync={handleRetrySync}
        onDismissError={handleDismissError}
        onSuccessDismissed={handleSuccessDismissed}
      />
      <CardList highlightCardId={highlightCardId} />
    </>
  );
};

export default HomeScreen;
