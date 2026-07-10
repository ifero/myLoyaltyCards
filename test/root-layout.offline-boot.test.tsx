/**
 * Story 16.10: offline cold-start boot behaviour (integration).
 *
 * Two guarantees that the isolated hook/util tests can't prove on their own:
 *  1. A stalled `Updates.checkForUpdateAsync()` cannot hang boot — the
 *     `withTimeout` wrapper bounds it and initialization proceeds (AC1).
 *  2. When the auth listener is stalled on an offline refresh of an expired
 *     token, the SecureStore probe still boots the user as authenticated — no
 *     flash / no `/welcome` bounce (AC2, AC4).
 */
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '@/app/_layout';

const mockRouter = { replace: jest.fn(), back: jest.fn(), push: jest.fn() };
const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockCheckForUpdateAsync = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockHasPersistedSession = jest.fn();
const mockIsFirstLaunch = jest.fn();
const mockCompleteFirstLaunch = jest.fn();

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

jest.mock('expo-updates', () => ({
  isEnabled: true,
  checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdateAsync(...args),
  fetchUpdateAsync: jest.fn().mockResolvedValue(undefined),
  reloadAsync: jest.fn().mockResolvedValue(undefined)
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

describe('RootLayout offline cold-start boot (Story 16.10)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Initialise i18n with real timers, then switch to fake for the test body.
    await act(async () => {
      await changeAppLanguage('en');
    });
    jest.useFakeTimers();
    mockCheckForUpdateAsync.mockResolvedValue({ isAvailable: false });
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
});
