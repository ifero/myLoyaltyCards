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

type CardListMockProps = { highlightCardId?: string | null; onHighlightEnd?: () => void };

const mockCardList = jest.fn((props: CardListMockProps) => {
  void props;
  return null;
});

const lastCardListProps = () => mockCardList.mock.calls[mockCardList.mock.calls.length - 1]![0];
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
  CardList: (props: CardListMockProps) => {
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
  it('passes newCardId to CardList and consumes the route params', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ newCardId: 'new-card-123' });

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockCardList).toHaveBeenCalledWith(
        expect.objectContaining({ highlightCardId: 'new-card-123' })
      );
    });

    await waitFor(() => {
      expect(useRouter().setParams).toHaveBeenCalledWith({
        newCardId: undefined,
        newCardName: undefined
      });
    });
  });

  // Story 22.2: on device, `router.replace('/')` swapped in a new Home route — a remount that
  // dropped the highlight before any tile drew it, so the ring never played. The params are
  // consumed in place instead, and the highlight survives consuming them.
  it('consumes the params in place, without replacing the screen', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ newCardId: 'new-card-123' });

    render(<HomeScreen />);
    await waitFor(() => expect(useRouter().setParams).toHaveBeenCalledTimes(1));

    expect(useRouter().replace).not.toHaveBeenCalled();
    expect(lastCardListProps().highlightCardId).toBe('new-card-123');
  });

  // Story 22.2 (#251 item 15): the ring plays once, so its end clears the highlight and nothing
  // can replay it — not a remount, a scroll back or a recycled cell.
  it('clears the highlight when the just-added card’s ring has ended', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ newCardId: 'new-card-123' });

    render(<HomeScreen />);
    await waitFor(() => expect(lastCardListProps().highlightCardId).toBe('new-card-123'));

    act(() => lastCardListProps().onHighlightEnd?.());

    await waitFor(() => expect(lastCardListProps().highlightCardId).toBeNull());
  });

  // A stable callback, so the tile's ring is never restarted by a new identity on re-render.
  it('hands CardList the same end-of-ring callback on every render', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ newCardId: 'new-card-123' });

    const { rerender } = render(<HomeScreen />);
    await waitFor(() => expect(lastCardListProps().highlightCardId).toBe('new-card-123'));
    const first = lastCardListProps().onHighlightEnd;

    rerender(<HomeScreen />);

    expect(first).toEqual(expect.any(Function));
    expect(lastCardListProps().onHighlightEnd).toBe(first);
  });

  it('touches no route params when newCardId is missing', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockCardList).toHaveBeenCalledWith(expect.objectContaining({ highlightCardId: null }));
    });

    expect(useRouter().setParams).not.toHaveBeenCalled();
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
