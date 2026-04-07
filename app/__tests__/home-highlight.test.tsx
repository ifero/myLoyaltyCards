import { render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import HomeScreen from '../index';

const mockCardList = jest.fn((props: { highlightCardId?: string | null }) => {
  void props;
  return null;
});

jest.mock('@/features/cards', () => ({
  CardList: (props: { highlightCardId?: string | null }) => {
    mockCardList(props);
    return null;
  },
  useCards: () => ({
    cards: [{ id: 'card-1' }],
    isLoading: false
  })
}));

jest.mock('@/features/auth/MigrationBanner', () => () => null);
jest.mock('@/features/auth/components', () => ({
  GuestModeBanner: () => null
}));
jest.mock('@/features/auth/useGuestMigration', () => ({
  useGuestMigration: () => ({
    status: 'idle',
    message: '',
    retry: jest.fn(),
    dismiss: jest.fn()
  })
}));
jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: () => ({ authState: 'guest', isAuthenticated: false })
}));

jest.mock('@/shared/components/SyncErrorBanner', () => ({
  SyncErrorBanner: () => null
}));

jest.mock('@/shared/components/SyncIndicator', () => ({
  SyncIndicator: () => null
}));

jest.mock('@/shared/hooks/useCloudSync', () => ({
  useCloudSync: () => ({
    isSyncing: false,
    syncError: null,
    forceSync: jest.fn(),
    clearSyncError: jest.fn()
  })
}));

jest.mock('@/shared/hooks/useAutoSync', () => ({
  useAutoSync: () => ({
    isSyncing: false,
    syncError: null,
    clearSyncError: jest.fn(),
    retrySync: jest.fn()
  })
}));

jest.mock('@/features/onboarding', () => ({
  OnboardingOverlay: () => null
}));

jest.mock('@/features/settings', () => ({
  isOnboardingCompleted: () => true,
  completeOnboarding: jest.fn()
}));

jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, jest.fn()]
}));

describe('HomeScreen highlight lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes newCardId to CardList and clears route params via replace', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ newCardId: 'new-card-123' });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockCardList).toHaveBeenCalledWith(
        expect.objectContaining({ highlightCardId: 'new-card-123' })
      );
    });

    await waitFor(() => {
      expect(useRouter().replace).toHaveBeenCalledWith('/');
    });
  });

  it('does not call replace when newCardId is missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockCardList).toHaveBeenCalledWith(expect.objectContaining({ highlightCardId: null }));
    });

    expect(useRouter().replace).not.toHaveBeenCalled();
  });
});
