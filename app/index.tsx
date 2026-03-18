/**
 * Home Screen
 * Story 2.1: Display Card List
 *
 * Main screen displaying the card list grid or empty state.
 */

import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import MigrationBanner from '@/features/auth/MigrationBanner';
import { useGuestMigration } from '@/features/auth/useGuestMigration';
import { CardList, useCards } from '@/features/cards';
import { OnboardingOverlay } from '@/features/onboarding';
import { isOnboardingCompleted, completeOnboarding } from '@/features/settings';

const HomeScreen = () => {
  const { cards, isLoading } = useCards();
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const [, requestPermission] = useCameraPermissions();
  const { status, message, retry, dismiss } = useGuestMigration();

  useEffect(() => {
    if (!isLoading) {
      setVisible(cards.length === 0 && !isOnboardingCompleted());
    }
  }, [isLoading, cards.length]);

  const handleRequestClose = () => {
    completeOnboarding();
    setVisible(false);
  };

  const handleAddManual = () => {
    router.push('/add-card');
  };

  const handleScan = async () => {
    const res = await requestPermission();
    if (!res.granted) {
      const err = new Error('Permission denied');
      (err as { name?: string }).name = 'PermissionDenied';
      throw err;
    }
    router.push('/scan');
  };

  return (
    <>
      <MigrationBanner status={status} message={message} onRetry={retry} onDismiss={dismiss} />
      <CardList />
      <OnboardingOverlay
        visible={visible}
        onRequestClose={handleRequestClose}
        onAddManual={handleAddManual}
        onScan={handleScan}
        onComplete={() => {
          completeOnboarding();
          setVisible(false);
        }}
      />
    </>
  );
};

export default HomeScreen;
