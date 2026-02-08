/**
 * Home Screen
 * Story 2.1: Display Card List
 *
 * Main screen displaying the card list grid or empty state.
 */

import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { CardList, useCards } from '@/features/cards';
import { OnboardingOverlay } from '@/features/onboarding';
import { isOnboardingCompleted, completeOnboarding } from '@/features/settings';

const HomeScreen = () => {
  const { cards, isLoading } = useCards();
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const [, requestPermission] = useCameraPermissions();

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
    completeOnboarding();
    setVisible(false);
    router.push('/add-card');
  };

  const handleScan = async () => {
    const res = await requestPermission();
    if (!res.granted) {
      const err = new Error('Permission denied');
      (err as { name?: string }).name = 'PermissionDenied';
      throw err;
    }
    completeOnboarding();
    setVisible(false);
    router.push('/scan');
  };

  return (
    <>
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
