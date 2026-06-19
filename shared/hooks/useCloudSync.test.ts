import { act, renderHook, waitFor } from '@testing-library/react-native';

import { logger } from '@/core/utils/logger';

const mockUploadLocalCards = jest.fn();
const mockForceSyncLocalCards = jest.fn();
const mockDownloadCloudCards = jest.fn();
const mockRetryWithBackoff = jest.fn();
const mockGetSession = jest.fn();
const mockUseAuthState = jest.fn();
const mockUseNetworkStatus = jest.fn();
const mockUpsertCards = jest.fn();
const mockFetchCards = jest.fn();
const mockBatchUpsertCards = jest.fn();

jest.mock('@/core/sync', () => ({
  uploadLocalCards: (...args: unknown[]) => mockUploadLocalCards(...args),
  forceSyncLocalCards: (...args: unknown[]) => mockForceSyncLocalCards(...args),
  downloadCloudCards: (...args: unknown[]) => mockDownloadCloudCards(...args),
  retryWithBackoff: (...args: unknown[]) => mockRetryWithBackoff(...args)
}));

jest.mock('@/core/database/card-repository', () => ({
  batchUpsertCards: (...args: unknown[]) => mockBatchUpsertCards(...args)
}));

jest.mock('@/shared/supabase/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args)
}));

jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: (...args: unknown[]) => mockUseAuthState(...args)
}));

jest.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: (...args: unknown[]) => mockUseNetworkStatus(...args)
}));

jest.mock('@/shared/supabase/cards', () => ({
  upsertCards: (...args: unknown[]) => mockUpsertCards(...args),
  fetchCards: (...args: unknown[]) => mockFetchCards(...args)
}));

import { __resetCloudSyncStoreForTests, useCloudSync } from './useCloudSync';

const MOCK_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const successDownload = {
  success: true,
  downloadedCount: 2,
  mergeResult: {
    merged: [{ id: '1' }, { id: '2' }],
    added: 2,
    updated: 0,
    unchanged: 0,
    skipped: 0
  },
  errors: [],
  throttled: false
};

const successUpload = {
  success: true,
  uploadedCount: 1,
  failedCount: 0,
  errors: [],
  throttled: false
};

const networkReady = { isConnected: true, isInternetReachable: true, isReady: true };
// Matches the production optimistic default exactly: useNetworkStatus initialises
// isConnected=true & isInternetReachable=true but isReady=false on first render.
const networkOptimisticDefault = { isConnected: true, isInternetReachable: true, isReady: false };
const networkOffline = { isConnected: false, isInternetReachable: false, isReady: true };

beforeEach(() => {
  jest.clearAllMocks();

  // useCloudSync now backs onto a module-level singleton store (Story 16.8
  // efficiency pass). Reset it between cases so the latch / in-flight guards /
  // snapshot don't leak across tests.
  __resetCloudSyncStoreForTests();

  mockUseAuthState.mockReturnValue({
    authState: 'guest',
    isAuthenticated: false
  });

  mockUseNetworkStatus.mockReturnValue(networkReady);

  mockGetSession.mockResolvedValue({
    success: true,
    data: {
      user: { id: MOCK_USER_ID },
      access_token: 'token'
    }
  });

  mockDownloadCloudCards.mockResolvedValue(successDownload);
  mockUploadLocalCards.mockResolvedValue(successUpload);
  mockForceSyncLocalCards.mockResolvedValue(successUpload);
  mockBatchUpsertCards.mockResolvedValue(undefined);

  // Default retryWithBackoff impl: a simple loop with NO delays. Honors the caller's
  // maxRetries/onRetry options so misconfigured production calls (e.g. maxRetries: 0)
  // would be caught by tests rather than masked by a hardcoded retry count.
  // Mirrors the real one's surface — calls fn(), retries on throw, wraps final error
  // with name 'SYNC_MAX_RETRIES' so callers can distinguish exhausted-retry failures.
  type RetryOpts = {
    maxRetries?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  };
  mockRetryWithBackoff.mockImplementation(
    async (fn: () => Promise<unknown>, options: RetryOpts = {}) => {
      const { maxRetries = 3, onRetry } = options;
      let lastError: unknown;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            onRetry?.(attempt + 1, 0, error);
          }
        }
      }
      const underlying = lastError instanceof Error ? lastError.message : String(lastError);
      const wrapped = new Error(`Sync failed after max retries: ${underlying}`);
      wrapped.name = 'SYNC_MAX_RETRIES';
      throw wrapped;
    }
  );
});

describe('useCloudSync', () => {
  describe('happy-path auto-trigger', () => {
    it('auto-triggers sync on authenticated state when network is ready', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
        expect(mockUploadLocalCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
      });
    });

    it('wraps the auto-trigger in retryWithBackoff (AC4)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });
      const [, options] = mockRetryWithBackoff.mock.calls[0];
      expect(options).toEqual(
        expect.objectContaining({
          maxRetries: 3,
          baseDelay: 1000
        })
      );
    });

    it('persists merged cards to local DB after download', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockBatchUpsertCards).toHaveBeenCalledWith(successDownload.mergeResult.merged);
      });
    });

    it('sets downloadedCount from merge result', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(result.current.downloadedCount).toBe(2);
      });
    });

    it('skips DB persist and upload when throttled', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      mockDownloadCloudCards.mockResolvedValue({
        success: true,
        downloadedCount: 0,
        mergeResult: null,
        errors: [],
        throttled: true
      });

      renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockDownloadCloudCards).toHaveBeenCalled();
      });

      expect(mockBatchUpsertCards).not.toHaveBeenCalled();
      expect(mockUploadLocalCards).not.toHaveBeenCalled();
    });
  });

  describe('manual triggerSync / forceSync', () => {
    it('sets syncError when download fails (manual triggerSync)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      mockDownloadCloudCards.mockResolvedValue({
        success: false,
        downloadedCount: 0,
        mergeResult: null,
        errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
        throttled: false
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.syncError).toBe('Network timeout');
      expect(mockUploadLocalCards).not.toHaveBeenCalled();
    });

    it('sets syncError when upload fails (manual triggerSync)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      mockUploadLocalCards.mockResolvedValue({
        success: false,
        uploadedCount: 0,
        failedCount: 1,
        errors: [{ code: 'SYNC_UPLOAD_BATCH_FAILED', message: 'Upload failed' }],
        throttled: false
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.syncError).toBe('Upload failed');
    });

    it('sets specific error when session retrieval fails (manual triggerSync)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      mockGetSession.mockResolvedValue({
        success: false,
        error: { message: 'Session expired' }
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.syncError).toBe('Session expired');
    });

    it('handles unexpected error gracefully (manual triggerSync)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      mockDownloadCloudCards.mockRejectedValue(new Error('unexpected'));

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.syncError).toBe('Cloud sync failed. Pull to retry.');
    });

    it('forceSync calls forced download and upload paths', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function), {
        forceSync: true
      });
      expect(mockForceSyncLocalCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
    });

    it('triggerSync calls non-forced download and upload paths', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
      expect(mockUploadLocalCards).toHaveBeenCalled();
    });

    it('clearSyncError resets sync error state', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      mockDownloadCloudCards.mockResolvedValue({
        success: false,
        downloadedCount: 0,
        mergeResult: null,
        errors: [{ code: 'FAIL', message: 'Error' }],
        throttled: false
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.syncError).toBe('Error');

      act(() => {
        result.current.clearSyncError();
      });

      expect(result.current.syncError).toBeNull();
    });

    it('does not run sync when not authenticated (manual triggerSync)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'guest',
        isAuthenticated: false
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockGetSession).not.toHaveBeenCalled();
      expect(mockDownloadCloudCards).not.toHaveBeenCalled();
    });

    it('forceSync does NOT use retryWithBackoff — pull-to-refresh is single-attempt (AC4, AC5)', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
    });
  });

  describe('AC1: latch-on-success (Story 16.8)', () => {
    it('does NOT latch autoTriggeredRef on a failed first attempt', async () => {
      // Failed first attempt — downloadCloudCards consistently returns success: false → retries exhaust → banner.
      mockDownloadCloudCards.mockResolvedValue({
        success: false,
        downloadedCount: 0,
        mergeResult: null,
        errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
        throttled: false
      });

      let networkState = networkReady;
      mockUseNetworkStatus.mockImplementation(() => networkState);

      let authMock: { authState: string; isAuthenticated: boolean } = {
        authState: 'authenticated',
        isAuthenticated: true
      };
      mockUseAuthState.mockImplementation(() => authMock);

      const { rerender } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });

      // Simulate a transient network drop then recovery — the latch should NOT have been set
      // by the failed first attempt, so a fresh auto-trigger fires.
      networkState = networkOffline;
      rerender({});

      networkState = networkReady;
      rerender({});

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(2);
      });
    });

    it('does latch autoTriggeredRef after a successful sync (no duplicate auto-syncs)', async () => {
      let networkState = networkReady;
      mockUseNetworkStatus.mockImplementation(() => networkState);

      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { rerender } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });

      // Network bounces — but since the first sync succeeded, the latch is set and no second fire.
      networkState = networkOffline;
      rerender({});

      networkState = networkReady;
      rerender({});

      // Yield a tick so any pending effects run.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC2: auto-recovery on next auth/network event (Story 16.8)', () => {
    it('auto-retries successfully after a cold-start failure recovers', async () => {
      // First-render attempt: download fails consistently across all retries → latch NOT set.
      // After we flip to success and re-trigger via a network event, sync succeeds.
      let downloadShouldFail = true;
      mockDownloadCloudCards.mockImplementation(async () =>
        downloadShouldFail
          ? {
              success: false,
              downloadedCount: 0,
              mergeResult: null,
              errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
              throttled: false
            }
          : successDownload
      );

      let networkState = networkReady;
      mockUseNetworkStatus.mockImplementation(() => networkState);

      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { result, rerender } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(result.current.syncError).toBe('Cloud sync failed. Pull to retry.');
      });

      // Recovery: flip backend behavior, simulate a network reconnect.
      downloadShouldFail = false;
      networkState = networkOffline;
      rerender({});
      networkState = networkReady;
      rerender({});

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.syncError).toBeNull();
      });
    });

    it('auto-retries successfully after an auth-state cycle (loading → authenticated) recovers (AC2)', async () => {
      // Token refresh / re-auth flow: the auto-trigger effect's deps include authState,
      // so a cycle to 'loading' and back to 'authenticated' re-runs the effect and
      // re-fires the auto-trigger (latch was never set because the first attempt failed).
      let downloadShouldFail = true;
      mockDownloadCloudCards.mockImplementation(async () =>
        downloadShouldFail
          ? {
              success: false,
              downloadedCount: 0,
              mergeResult: null,
              errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
              throttled: false
            }
          : successDownload
      );

      let authMock: { authState: string; isAuthenticated: boolean } = {
        authState: 'authenticated',
        isAuthenticated: true
      };
      mockUseAuthState.mockImplementation(() => authMock);

      const { result, rerender } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(result.current.syncError).toBe('Cloud sync failed. Pull to retry.');
      });

      // Recovery via auth event: backend recovers, then auth cycles loading → authenticated.
      downloadShouldFail = false;
      authMock = { authState: 'loading', isAuthenticated: false };
      rerender({});

      authMock = { authState: 'authenticated', isAuthenticated: true };
      rerender({});

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.syncError).toBeNull();
      });
    });
  });

  describe('AC3: auth + network gate (Story 16.8)', () => {
    it('does NOT auto-trigger while authState is loading', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: false
      });

      renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
      expect(mockDownloadCloudCards).not.toHaveBeenCalled();
    });

    it('does NOT auto-trigger on the optimistic network default (isConnected=true, isReady=false)', async () => {
      // This is the EXACT pre-fix bug state — useNetworkStatus optimistically
      // initialises isConnected/isInternetReachable to true on first render.
      // Without the isReady gate, useCloudSync would fire prematurely.
      mockUseNetworkStatus.mockReturnValue(networkOptimisticDefault);
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
      expect(mockDownloadCloudCards).not.toHaveBeenCalled();
    });

    it('does NOT auto-trigger when network is ready but offline', async () => {
      mockUseNetworkStatus.mockReturnValue(networkOffline);
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
      expect(mockDownloadCloudCards).not.toHaveBeenCalled();
    });

    it('does NOT auto-trigger when isConnected but isInternetReachable is false', async () => {
      mockUseNetworkStatus.mockReturnValue({
        isConnected: true,
        isInternetReachable: false,
        isReady: true
      });
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
    });

    it('fires auto-trigger only after auth=authenticated AND network is ready+reachable', async () => {
      let networkState = networkOptimisticDefault;
      mockUseNetworkStatus.mockImplementation(() => networkState);

      let authMock: { authState: string; isAuthenticated: boolean } = {
        authState: 'loading',
        isAuthenticated: false
      };
      mockUseAuthState.mockImplementation(() => authMock);

      const { rerender } = renderHook(() => useCloudSync());

      // Auth becomes authenticated but network not ready — still no sync.
      authMock = { authState: 'authenticated', isAuthenticated: true };
      rerender({});

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();

      // Network confirmed reachable — sync fires.
      networkState = networkReady;
      rerender({});

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('AC4: retryWithBackoff before banner (Story 16.8)', () => {
    it('does NOT surface the banner when a transient failure recovers within retries', async () => {
      // Mock retryWithBackoff to simulate the transient case: throws once, recovers on second attempt.
      let attempt = 0;
      mockRetryWithBackoff.mockImplementation(async (fn: () => Promise<unknown>) => {
        for (let i = 0; i <= 3; i++) {
          try {
            return await fn();
          } catch (e) {
            attempt += 1;
            if (i === 0) {
              continue;
            }
            throw e;
          }
        }
        throw new Error('retryWithBackoff mock: loop exited without return');
      });

      // First call fails, subsequent calls succeed.
      let downloadCalls = 0;
      mockDownloadCloudCards.mockImplementation(async () => {
        downloadCalls += 1;
        if (downloadCalls === 1) {
          return {
            success: false,
            downloadedCount: 0,
            mergeResult: null,
            errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
            throttled: false
          };
        }
        return successDownload;
      });

      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockUploadLocalCards).toHaveBeenCalled();
      });

      expect(result.current.syncError).toBeNull();
      expect(attempt).toBeGreaterThanOrEqual(1);
    });

    it('surfaces the generic banner only after retries are exhausted', async () => {
      mockDownloadCloudCards.mockResolvedValue({
        success: false,
        downloadedCount: 0,
        mergeResult: null,
        errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
        throttled: false
      });

      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(result.current.syncError).toBe('Cloud sync failed. Pull to retry.');
      });
    });
  });

  describe('AC5: guest + happy-path preserved (Story 16.8)', () => {
    it('does NOT auto-trigger in guest mode regardless of network state', async () => {
      mockUseAuthState.mockReturnValue({
        authState: 'guest',
        isAuthenticated: false
      });

      renderHook(() => useCloudSync());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
      expect(mockDownloadCloudCards).not.toHaveBeenCalled();
    });

    it('resets the latch when user signs out so a re-sign-in re-fires auto-sync', async () => {
      let authMock: { authState: string; isAuthenticated: boolean } = {
        authState: 'authenticated',
        isAuthenticated: true
      };
      mockUseAuthState.mockImplementation(() => authMock);

      const { rerender } = renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });

      // Sign out — latch should reset.
      authMock = { authState: 'guest', isAuthenticated: false };
      rerender({});

      await act(async () => {
        await Promise.resolve();
      });

      // Sign back in — auto-sync fires again.
      authMock = { authState: 'authenticated', isAuthenticated: true };
      rerender({});

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('race-safety regressions (Story 16.8 review)', () => {
    it('does NOT latch the auto-trigger if performSync no-ops because a manual sync is in flight', async () => {
      // Reproduces review finding #1: between retry backoff sleeps, isRunningRef
      // is briefly true while a manual sync is mid-flight. The pre-fix code
      // returned undefined from performSync in that window, which retryWithBackoff
      // treated as success — incorrectly latching the auto-trigger.
      let manualBlocking = true;
      mockUploadLocalCards.mockImplementation(async () => {
        // Hold the manual sync open until we release it explicitly.
        while (manualBlocking) {
          await new Promise<void>((r) => setTimeout(r, 0));
        }
        return successUpload;
      });

      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      // Kick off a long-running manual sync, then while it is still mid-flight
      // call triggerSync again — the second call must silently no-op (the first
      // sync owns the shared in-flight guard) WITHOUT setting a banner. Driven
      // inside ONE act() scope so the blocked sync's trailing store update on
      // release stays inside the tracked render window.
      await act(async () => {
        const inflight = result.current.triggerSync();
        // performSync claims the in-flight guard synchronously; the yield just
        // lets the first call settle into its awaits before the second lands.
        await Promise.resolve();
        await result.current.triggerSync();
        expect(result.current.syncError).toBeNull();
        // Release the first sync and let it drain to completion.
        manualBlocking = false;
        await inflight;
      });

      // Auto-trigger latch never engaged via the manual path — it's still false,
      // so a subsequent auth+network event can fire a fresh auto-sync.
      expect(mockRetryWithBackoff).not.toHaveBeenCalled();
    });

    it('an auto-sync begun before unmount is owned by the store and completes independently', async () => {
      // Story 16.8 efficiency pass: the sync is now a module-level store side
      // effect, not component-local state. Unmounting a subscriber mid-sync must
      // neither cancel the in-flight run nor produce state-update-after-unmount
      // warnings — the store outlives the component, and a freshly mounted
      // instance observes the completed result.
      let releaseAttempt: (() => void) | undefined;
      mockDownloadCloudCards.mockImplementation(async () => {
        await new Promise<void>((r) => {
          releaseAttempt = r;
        });
        return successDownload;
      });

      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      const { unmount } = renderHook(() => useCloudSync());

      // Wait for the auto-trigger to enter the first download attempt.
      await waitFor(() => {
        expect(mockDownloadCloudCards).toHaveBeenCalledTimes(1);
      });

      // Unmount the only subscriber while the download is still in flight.
      unmount();

      // Release the blocked attempt — the store-owned sync runs to completion
      // (download → upload) despite there being no mounted component.
      await act(async () => {
        releaseAttempt?.();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockUploadLocalCards).toHaveBeenCalled();
      });

      // No error was logged — the sync succeeded, not cancelled-as-failure.
      const errorLogs = loggerErrorSpy.mock.calls.filter((c) =>
        String(c[0]).includes('[useCloudSync]')
      );
      expect(errorLogs).toHaveLength(0);

      // A freshly mounted instance sees the completed snapshot — proof the store
      // outlives the component that started the sync.
      const { result } = renderHook(() => useCloudSync());
      expect(result.current.downloadedCount).toBe(2);
      expect(result.current.syncError).toBeNull();

      loggerErrorSpy.mockRestore();
    });

    it('runs the cold-open auto-sync only ONCE across multiple concurrently mounted instances', async () => {
      // The core efficiency win: HomeScreen and its child CardList both mount
      // useCloudSync, so without a shared store each would fire its own auto-sync
      // on cold open. The module-level latch + in-flight guard must collapse them
      // into a single download→upload cycle.
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      // Three simultaneously mounted instances, mirroring the real call sites
      // (app/index, CardList, settings sync trigger).
      renderHook(() => useCloudSync());
      renderHook(() => useCloudSync());
      renderHook(() => useCloudSync());

      await waitFor(() => {
        expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      });

      // Give any duplicate auto-triggers a chance to (incorrectly) fire.
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      expect(mockDownloadCloudCards).toHaveBeenCalledTimes(1);
      expect(mockUploadLocalCards).toHaveBeenCalledTimes(1);
    });

    it('auto-sync started while a manual sync is in flight bails quietly — no spurious banner (review finding #1)', async () => {
      // The shared store means manual + auto contend for one in-flight guard.
      // If a pull-to-refresh is mid-flight when the cold-open auto-trigger fires,
      // the auto path must bail cleanly rather than throw SyncBusyError through
      // every retry, exhaust the budget, and show "sync failed" while the manual
      // sync is about to succeed. (A broken implementation sets syncError here.)
      let blocking = true;
      mockUploadLocalCards.mockImplementation(async () => {
        while (blocking) {
          await new Promise<void>((r) => setTimeout(r, 0));
        }
        return successUpload;
      });

      // Auth is settled but network starts not-ready, so the auto-trigger does
      // NOT fire at mount — leaving room to start a manual sync first.
      let networkState = networkOffline;
      mockUseNetworkStatus.mockImplementation(() => networkState);
      mockUseAuthState.mockReturnValue({
        authState: 'authenticated',
        isAuthenticated: true
      });

      const { result, rerender } = renderHook(() => useCloudSync());

      await act(async () => {
        // Start a manual sync — it claims the in-flight guard synchronously.
        const manual = result.current.triggerSync();
        await Promise.resolve();

        // Now bring the network up so the cold-open auto-trigger fires WHILE the
        // manual sync still holds the guard.
        networkState = networkReady;
        rerender({});
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // Auto-sync started but found the guard held → bailed quietly.
        expect(result.current.syncError).toBeNull();

        blocking = false;
        await manual;
      });

      // The auto path ran (retryWithBackoff invoked) but did not surface a banner
      // or perform a duplicate sync — only the manual sync's single cycle ran.
      expect(mockRetryWithBackoff).toHaveBeenCalledTimes(1);
      expect(result.current.syncError).toBeNull();
      expect(mockDownloadCloudCards).toHaveBeenCalledTimes(1);
      expect(mockUploadLocalCards).toHaveBeenCalledTimes(1);
    });

    it('does NOT surface a banner when triggerSync is called while another sync is in flight', async () => {
      // Pure no-op semantics for SyncBusyError on the manual path — the user
      // who pulled-to-refresh while another sync was running should not see an
      // error; the in-flight sync will complete on its own.
      let blocking = true;
      mockUploadLocalCards.mockImplementation(async () => {
        while (blocking) {
          await new Promise<void>((r) => setTimeout(r, 0));
        }
        return successUpload;
      });

      mockUseAuthState.mockReturnValue({
        authState: 'loading',
        isAuthenticated: true
      });

      const { result } = renderHook(() => useCloudSync());

      // One act() scope: start the blocking triggerSync, fire forceSync while it
      // is mid-flight (must no-op), then release and drain the first sync.
      await act(async () => {
        const first = result.current.triggerSync();
        await Promise.resolve();
        await result.current.forceSync();
        expect(result.current.syncError).toBeNull();
        blocking = false;
        await first;
      });
    });
  });
});
