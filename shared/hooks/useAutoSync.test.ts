import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

const mockIsDirty = jest.fn();
const mockProcessPendingSync = jest.fn();
const mockGetPendingDeletions = jest.fn();
const mockClearPendingDeletions = jest.fn();
const mockGetSession = jest.fn();
const mockUseAuthState = jest.fn();
const mockUpsertCards = jest.fn();
const mockDeleteCardFromCloud = jest.fn();
const mockFetchCardsSince = jest.fn();
const mockBatchUpsertCards = jest.fn();

jest.mock('@/core/sync', () => ({
  isDirty: (...args: unknown[]) => mockIsDirty(...args),
  processPendingSync: (...args: unknown[]) => mockProcessPendingSync(...args),
  getPendingDeletions: (...args: unknown[]) => mockGetPendingDeletions(...args),
  clearPendingDeletions: (...args: unknown[]) => mockClearPendingDeletions(...args)
}));

jest.mock('@/shared/supabase/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args)
}));

jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: (...args: unknown[]) => mockUseAuthState(...args)
}));

jest.mock('@/shared/supabase/cards', () => ({
  upsertCards: (...args: unknown[]) => mockUpsertCards(...args),
  deleteCardFromCloud: (...args: unknown[]) => mockDeleteCardFromCloud(...args),
  fetchCardsSince: (...args: unknown[]) => mockFetchCardsSince(...args)
}));

jest.mock('@/core/database/card-repository', () => ({
  batchUpsertCards: (...args: unknown[]) => mockBatchUpsertCards(...args)
}));

import { useAutoSync, _SYNC_CHECK_INTERVAL_MS } from './useAutoSync';

let appStateListeners: Array<(state: AppStateStatus) => void> = [];
const mockRemove = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners = [];

  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListeners.push(listener as (state: AppStateStatus) => void);
    return { remove: mockRemove } as ReturnType<typeof AppState.addEventListener>;
  });

  mockUseAuthState.mockReturnValue({ authState: 'authenticated', isAuthenticated: true });
  mockIsDirty.mockResolvedValue(true);
  mockGetSession.mockResolvedValue({
    success: true,
    data: { user: { id: 'user-123' } }
  });
  mockProcessPendingSync.mockResolvedValue({
    success: true,
    upsertedCount: 1,
    deletedCount: 0,
    errors: []
  });

  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('useAutoSync', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useAutoSync());
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncError).toBeNull();
    expect(typeof result.current.clearSyncError).toBe('function');
  });

  it('exports SYNC_CHECK_INTERVAL_MS as 5 minutes', () => {
    expect(_SYNC_CHECK_INTERVAL_MS).toBe(5 * 60 * 1000);
  });

  it('triggers sync when app returns to foreground', async () => {
    renderHook(() => useAutoSync());

    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(mockIsDirty).toHaveBeenCalled();
    expect(mockProcessPendingSync).toHaveBeenCalledWith(
      'user-123',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('does not trigger sync on background AppState change', async () => {
    renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('background'));
    });

    expect(mockProcessPendingSync).not.toHaveBeenCalled();
  });

  it('does not sync when guest mode', async () => {
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });

    renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(mockIsDirty).not.toHaveBeenCalled();
    expect(mockProcessPendingSync).not.toHaveBeenCalled();
  });

  it('does not sync when not dirty', async () => {
    mockIsDirty.mockResolvedValue(false);

    renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(mockIsDirty).toHaveBeenCalled();
    expect(mockProcessPendingSync).not.toHaveBeenCalled();
  });

  it('sets syncError on sync failure', async () => {
    mockProcessPendingSync.mockResolvedValue({
      success: false,
      upsertedCount: 0,
      deletedCount: 0,
      errors: ['Network error']
    });

    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.syncError).toBe('Network error');
  });

  it('sets syncError on session failure', async () => {
    mockGetSession.mockResolvedValue({
      success: false,
      error: { message: 'Session expired' }
    });

    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.syncError).toBe('Session expired. Changes will sync after sign-in.');
  });

  it('sets syncError on unexpected exception', async () => {
    mockIsDirty.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.syncError).toBe('Sync failed unexpectedly. Will retry.');
  });

  it('clearSyncError clears the error', async () => {
    mockProcessPendingSync.mockResolvedValue({
      success: false,
      errors: ['fail']
    });

    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.syncError).toBe('fail');

    act(() => {
      result.current.clearSyncError();
    });

    expect(result.current.syncError).toBeNull();
  });

  it('cleans up AppState subscription on unmount', () => {
    const { unmount } = renderHook(() => useAutoSync());

    unmount();

    expect(mockRemove).toHaveBeenCalled();
  });

  it('does not register AppState listener when guest', () => {
    mockUseAuthState.mockReturnValue({ authState: 'guest', isAuthenticated: false });

    renderHook(() => useAutoSync());

    expect(appStateListeners).toHaveLength(0);
  });

  it('handles null session data gracefully', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.syncError).toBe('Session expired. Changes will sync after sign-in.');
    expect(mockProcessPendingSync).not.toHaveBeenCalled();
  });

  it('uses default Supabase functions when none provided', async () => {
    renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(mockProcessPendingSync).toHaveBeenCalledTimes(1);
  });

  it('resets isSyncing to false after sync completes', async () => {
    const { result } = renderHook(() => useAutoSync());

    await act(async () => {
      appStateListeners.forEach((l) => l('active'));
    });

    expect(result.current.isSyncing).toBe(false);
  });
});
