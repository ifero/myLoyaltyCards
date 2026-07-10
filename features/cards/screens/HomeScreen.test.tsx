import { act, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import HomeScreen from './HomeScreen';

type CloudSyncState = {
  isSyncing: boolean;
  syncError: string | null;
  forceSync: () => void;
  clearSyncError: () => void;
};
type AutoSyncState = {
  isSyncing: boolean;
  syncError: string | null;
  clearSyncError: () => void;
  retrySync: () => void;
};
type NetworkState = { isConnected: boolean; isInternetReachable: boolean };
type SyncStatusMockProps = {
  syncState: string;
  syncErrorMessage: string | null;
  isOffline: boolean;
  pendingChangeCount: number;
  onRetrySync: () => void;
  onDismissError: () => void;
  onSuccessDismissed: () => void;
};

const mockCardList = jest.fn((props: { highlightCardId?: string | null }) => {
  void props;
  return null;
});
const mockGuestModeBanner = jest.fn((props: { isGuestMode: boolean }) => {
  void props;
  return null;
});
const mockUseCards = jest.fn(() => ({
  cards: [{ id: 'card-1' }],
  isLoading: false
}));

const mockForceSync = jest.fn();
const mockRetrySync = jest.fn();
const mockClearSyncError = jest.fn();
const mockClearAutoSyncError = jest.fn();
const mockUseNetworkStatus = jest.fn(
  (): NetworkState => ({ isConnected: true, isInternetReachable: true })
);
const mockUseCloudSync = jest.fn(
  (): CloudSyncState => ({
    isSyncing: false,
    syncError: null,
    forceSync: mockForceSync,
    clearSyncError: mockClearSyncError
  })
);
const mockUseAutoSync = jest.fn(
  (): AutoSyncState => ({
    isSyncing: false,
    syncError: null,
    clearSyncError: mockClearAutoSyncError,
    retrySync: mockRetrySync
  })
);
const mockSyncStatusContainer = jest.fn((props: SyncStatusMockProps) => {
  void props;
  return null;
});

const syncProps = () =>
  mockSyncStatusContainer.mock.calls[mockSyncStatusContainer.mock.calls.length - 1]![0];

jest.mock('@/features/cards/components/CardList', () => ({
  CardList: (props: { highlightCardId?: string | null }) => {
    mockCardList(props);
    return null;
  }
}));

jest.mock('@/features/cards/hooks/useCards', () => ({
  useCards: () => mockUseCards()
}));

jest.mock('@/features/auth/MigrationBanner', () => () => null);
jest.mock('@/features/auth/components', () => ({
  GuestModeBanner: (props: { isGuestMode: boolean }) => {
    mockGuestModeBanner(props);
    return null;
  }
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

jest.mock('@/shared/components/SyncStatusContainer', () => ({
  SyncStatusContainer: (props: SyncStatusMockProps) => mockSyncStatusContainer(props)
}));

jest.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus()
}));

jest.mock('@/shared/hooks/useCloudSync', () => ({
  useCloudSync: () => mockUseCloudSync()
}));

jest.mock('@/shared/hooks/useAutoSync', () => ({
  useAutoSync: () => mockUseAutoSync()
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

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockUseCards.mockReturnValue({ cards: [{ id: 'card-1' }], isLoading: false });
  mockUseNetworkStatus.mockReturnValue({ isConnected: true, isInternetReachable: true });
  mockUseCloudSync.mockReturnValue({
    isSyncing: false,
    syncError: null,
    forceSync: mockForceSync,
    clearSyncError: mockClearSyncError
  });
  mockUseAutoSync.mockReturnValue({
    isSyncing: false,
    syncError: null,
    clearSyncError: mockClearAutoSyncError,
    retrySync: mockRetrySync
  });
});

describe('HomeScreen highlight lifecycle', () => {
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

  it('hides guest banner when cards are 4 or fewer', async () => {
    mockUseCards.mockReturnValue({
      cards: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
      isLoading: false
    });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockGuestModeBanner).toHaveBeenCalledWith(
        expect.objectContaining({ isGuestMode: false })
      );
    });
  });

  it('shows guest banner when guest has more than 4 cards', async () => {
    mockUseCards.mockReturnValue({
      cards: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
      isLoading: false
    });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockGuestModeBanner).toHaveBeenCalledWith(
        expect.objectContaining({ isGuestMode: true })
      );
    });
  });
});

describe('HomeScreen sync strip', () => {
  it('retries both cloud and auto sync when the strip requests a retry', async () => {
    render(<HomeScreen />);
    await waitFor(() => expect(mockSyncStatusContainer).toHaveBeenCalled());

    await act(async () => {
      await syncProps().onRetrySync();
    });

    expect(mockForceSync).toHaveBeenCalledTimes(1);
    expect(mockRetrySync).toHaveBeenCalledTimes(1);
  });

  it('clears both cloud and auto sync errors when the strip dismisses an error', async () => {
    render(<HomeScreen />);
    await waitFor(() => expect(mockSyncStatusContainer).toHaveBeenCalled());

    act(() => syncProps().onDismissError());

    expect(mockClearSyncError).toHaveBeenCalledTimes(1);
    expect(mockClearAutoSyncError).toHaveBeenCalledTimes(1);
  });

  it('reports a syncing state while a cloud sync is in flight', async () => {
    mockUseCloudSync.mockReturnValue({
      isSyncing: true,
      syncError: null,
      forceSync: mockForceSync,
      clearSyncError: mockClearSyncError
    });

    render(<HomeScreen />);

    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenCalledWith(
        expect.objectContaining({ syncState: 'syncing' })
      )
    );
  });

  it('reports an error state and forwards the message when a sync fails', async () => {
    mockUseCloudSync.mockReturnValue({
      isSyncing: false,
      syncError: 'sync failed',
      forceSync: mockForceSync,
      clearSyncError: mockClearSyncError
    });

    render(<HomeScreen />);

    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenCalledWith(
        expect.objectContaining({ syncState: 'error', syncErrorMessage: 'sync failed' })
      )
    );
  });

  it('reports offline when the network is unreachable', async () => {
    mockUseNetworkStatus.mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<HomeScreen />);

    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenCalledWith(
        expect.objectContaining({ isOffline: true })
      )
    );
  });

  it('surfaces success after a sync completes, then returns to idle on dismiss', async () => {
    mockUseCloudSync.mockReturnValue({
      isSyncing: true,
      syncError: null,
      forceSync: mockForceSync,
      clearSyncError: mockClearSyncError
    });

    const { rerender } = render(<HomeScreen />);
    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenCalledWith(
        expect.objectContaining({ syncState: 'syncing' })
      )
    );

    // Syncing → idle with no error flips the derived state to "success".
    mockUseCloudSync.mockReturnValue({
      isSyncing: false,
      syncError: null,
      forceSync: mockForceSync,
      clearSyncError: mockClearSyncError
    });
    rerender(<HomeScreen />);
    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenCalledWith(
        expect.objectContaining({ syncState: 'success' })
      )
    );

    // Dismissing success returns the strip to idle.
    act(() => syncProps().onSuccessDismissed());
    await waitFor(() =>
      expect(mockSyncStatusContainer).toHaveBeenLastCalledWith(
        expect.objectContaining({ syncState: 'idle' })
      )
    );
  });
});
