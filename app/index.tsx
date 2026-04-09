/**
 * Home Screen
 * Story 2.1: Display Card List
 *
 * Main screen displaying the card list grid or empty state.
 */

import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { SyncErrorBanner } from '@/shared/components/SyncErrorBanner';
import { SyncIndicator } from '@/shared/components/SyncIndicator';
import { useAutoSync } from '@/shared/hooks/useAutoSync';
import { useCloudSync } from '@/shared/hooks/useCloudSync';
import { useAuthState } from '@/shared/supabase/useAuthState';

import { GuestModeBanner } from '@/features/auth/components';
import MigrationBanner from '@/features/auth/MigrationBanner';
import { useGuestMigration } from '@/features/auth/useGuestMigration';
import { CardList, useCards } from '@/features/cards';

const HomeScreen = () => {
  const { cards } = useCards();
  const [highlightCardId, setHighlightCardId] = useState<string | null>(null);
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
  const hasSyncError = Boolean(syncError ?? autoSyncError);

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
      <SyncIndicator isSyncing={isSyncing || isAutoSyncing} hasError={hasSyncError} />
      <SyncErrorBanner
        message={syncError ?? autoSyncError}
        onRetry={async () => {
          await forceSync();
          await retrySync();
        }}
        onDismiss={() => {
          clearSyncError();
          clearAutoSyncError();
        }}
      />
      <CardList highlightCardId={highlightCardId} />
    </>
  );
};

export default HomeScreen;
