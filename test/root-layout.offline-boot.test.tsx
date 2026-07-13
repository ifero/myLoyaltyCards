/**
 * RootLayout cold-start boot behaviour (integration) — Stories 16.10 & 16.12.
 *
 * Guarantees that the isolated hook/util tests can't prove on their own:
 *  1. (16.10) A stalled `Updates.checkForUpdateAsync()` cannot hang boot — the
 *     `withTimeout` wrapper bounds it and initialization proceeds (AC1).
 *  2. (16.10) When the auth listener is stalled on an offline refresh of an
 *     expired token, the SecureStore probe still boots the user as
 *     authenticated — no flash / no `/welcome` bounce (AC2, AC4).
 *  3. (16.12) A stalled `Updates.fetchUpdateAsync()` (bundle download) cannot
 *     hang boot either — the same wrapper bounds it, so boot proceeds on the
 *     current bundle and `reloadAsync` is not reached (AC1); the normal OTA
 *     path (fetch then reload) is preserved (AC2).
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '@/app/_layout';

const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };
const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockCheckForUpdateAsync = jest.fn();
const mockFetchUpdateAsync = jest.fn();
const mockReloadAsync = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockHasPersistedSession = jest.fn();
const mockIsFirstLaunch = jest.fn();
const mockCompleteFirstLaunch = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdateAsync(...args),
  fetchUpdateAsync: (...args: unknown[]) => mockFetchUpdateAsync(...args),
  reloadAsync: (...args: unknown[]) => mockReloadAsync(...args)
}));

jest.mock('expo-router', () => {
  const Stack = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  (Stack as { Screen?: () => null }).Screen = () => null;
  return { Stack, useRouter: () => mockRouter };
});

jest.mock('@/core/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('@/core/watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined),
  subscribeToWatchMessages: jest.fn(() => jest.fn()),
  subscribeToWatchUserInfo: jest.fn(() => jest.fn())
}));

jest.mock('@/core/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args)
  }
}));

jest.mock('@/core/auth/guest-session-repository', () => ({
  getOrCreateGuestSessionId: jest.fn().mockResolvedValue('guest-1')
}));

jest.mock('@/features/settings', () => ({
  isFirstLaunch: () => mockIsFirstLaunch(),
  completeFirstLaunch: () => mockCompleteFirstLaunch()
}));

jest.mock('@/shared/supabase/client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
        mockOnAuthStateChange(callback)
    }
  })),
  hasPersistedSession: () => mockHasPersistedSession()
}));

jest.mock('@/shared/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    isDark: false,
    theme: { primary: '#1A73E8', surface: '#FFFFFF', textPrimary: '#1F1F24', background: '#FFFFFF' }
  })
}));

/** onAuthStateChange that never fires — simulates the SDK stalled on an offline
 * refresh of an expired token (no INITIAL_SESSION emitted). */
const withStalledListener = () => {
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } }
  }));
};

/** Fire INITIAL_SESSION synchronously with the given session. */
const emitInitialSession = (session: unknown) => {
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: string, session: unknown) => void) => {
      callback('INITIAL_SESSION', session);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }
  );
};

describe('RootLayout cold-start boot (Stories 16.10, 16.12)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Initialise i18n with real timers, then switch to fake for the test body.
    await act(async () => {
      await changeAppLanguage('en');
    });
    jest.useFakeTimers();
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });
    mockFetchUpdateAsync.mockResolvedValue(undefined);
    mockReloadAsync.mockResolvedValue(undefined);
    mockHasPersistedSession.mockResolvedValue(false);
    mockIsFirstLaunch.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('completes boot after the update-check timeout even if checkForUpdateAsync never settles (AC1)', async () => {
    mockCheckForUpdateAsync.mockReturnValue(new Promise(() => {})); // never settles
    emitInitialSession(null); // auth resolves fast (guest)

    render(<RootLayout />);

    // Boot is gated on the pending (stalled) update check: spinner shown, no UI.
    expect(screen.getByTestId('boot-loading')).toBeTruthy();
    expect(mockGetAllCards).not.toHaveBeenCalled();

    // Advance well past UPDATE_CHECK_TIMEOUT_MS (5000ms in app/_layout.tsx).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });

    // withTimeout rejected → init proceeded AND the render gate flipped: the
    // loading spinner is gone (proves `isReady = isInitialized && isAuthReady`
    // actually became true, not merely that initializeApp ran).
    expect(screen.queryByTestId('boot-loading')).toBeNull();
    expect(mockGetAllCards).toHaveBeenCalled();
  });

  it('boots as authenticated from the storage probe when the auth listener stalls offline (expired token → no welcome bounce) (AC2, AC4)', async () => {
    withStalledListener(); // SDK stuck on offline refresh — no auth event
    mockHasPersistedSession.mockResolvedValue(true); // expired-but-present session
    mockIsFirstLaunch.mockReturnValue(true); // reinstall wiped the first_launch flag

    render(<RootLayout />);

    // Flush init + the storage probe + mount effects (all microtask-driven).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    // Recognised as signed-in from storage → first_launch cleared, NOT redirected.
    expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalledWith('/welcome');
  });

  it('boots the current bundle without reloading when the update download stalls (Story 16.12, AC1, AC3)', async () => {
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mockFetchUpdateAsync.mockReturnValue(new Promise(() => {})); // download never settles
    emitInitialSession(null); // auth resolves fast (guest)

    render(<RootLayout />);

    // Boot is gated on the pending (stalled) download: spinner shown.
    expect(screen.getByTestId('boot-loading')).toBeTruthy();

    // Well past the manifest-check budget (5s) but still inside the fetch
    // budget: boot must STILL be gated. This pins the download budget as
    // materially larger than the check timeout (guards against a regression
    // that reused UPDATE_CHECK_TIMEOUT_MS = 5000 for the fetch).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(29000);
    });
    expect(screen.getByTestId('boot-loading')).toBeTruthy();
    expect(mockReloadAsync).not.toHaveBeenCalled();
    expect(mockLoggerWarn).not.toHaveBeenCalled();

    // Cross UPDATE_FETCH_TIMEOUT_MS (30000ms in app/_layout.tsx): withTimeout
    // rejects → boot proceeds on the CURRENT bundle — the spinner is gone
    // (isReady flipped) and getAllCards ran...
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(screen.queryByTestId('boot-loading')).toBeNull();
    expect(mockGetAllCards).toHaveBeenCalled();
    // ...reloadAsync was never reached (nothing downloaded to swap in)...
    expect(mockReloadAsync).not.toHaveBeenCalled();
    // ...and the stall was logged via logger.warn, never escalated to the
    // dbError path (logger.error precedes every setDbError) (AC3).
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Expo update download/reload failed:',
      expect.any(Error)
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('boots the current bundle without reloading when the update download errors outright (Story 16.12, AC3)', async () => {
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mockFetchUpdateAsync.mockRejectedValueOnce(new Error('network error'));
    emitInitialSession(null); // auth resolves fast (guest)

    render(<RootLayout />);

    // A genuine fetch rejection (not just a stall) degrades the same way as a
    // timeout: boot the current bundle, no reload, logged (not dbError).
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByTestId('boot-loading')).toBeNull();
    expect(mockGetAllCards).toHaveBeenCalled();
    expect(mockReloadAsync).not.toHaveBeenCalled();
    expect(mockLoggerWarn).toHaveBeenCalledWith(
      'Expo update download/reload failed:',
      expect.any(Error)
    );
    expect(mockLoggerError).not.toHaveBeenCalled();
  });

  it('completes fetch then reload for a slow download that finishes within budget (Story 16.12, AC2)', async () => {
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: true });
    // A slow-but-completing download: resolves at 25s, comfortably under the
    // 30s budget. The wrapper must let it finish and still reload — it must
    // never abort a legitimate slow download.
    mockFetchUpdateAsync.mockReturnValue(
      new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 25000);
      })
    );
    emitInitialSession(null);

    render(<RootLayout />);

    // Mid-download (still under budget): reload has not run yet.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20000);
    });
    expect(mockReloadAsync).not.toHaveBeenCalled();

    // Download completes (25s < 30s budget) → fetch then reload both run.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(6000);
    });
    expect(mockFetchUpdateAsync).toHaveBeenCalledTimes(1);
    expect(mockReloadAsync).toHaveBeenCalledTimes(1);
    expect(mockLoggerWarn).not.toHaveBeenCalled();
  });

  it('never reaches the download when the update check fails, e.g. offline (Story 16.12, AC6)', async () => {
    // Fully offline: the manifest check fails, so the fetch/reload path — nested
    // inside `if (update.isAvailable)` behind the check — is never reached (AC6).
    mockCheckForUpdateAsync.mockRejectedValueOnce(new Error('offline'));
    emitInitialSession(null);

    render(<RootLayout />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    expect(mockFetchUpdateAsync).not.toHaveBeenCalled();
    expect(mockReloadAsync).not.toHaveBeenCalled();
    // Boot still completes on the current bundle; no dbError escalation.
    expect(screen.queryByTestId('boot-loading')).toBeNull();
    expect(mockLoggerError).not.toHaveBeenCalled();
  });
});
