/**
 * Regression: welcome-gate must not trap signed-in users.
 *
 * Background — the routed-onboarding refactor (commit e0ffe72) moved the
 * `completeFirstLaunch()` call to the end of the LOCAL-mode highlights path
 * only. Account-creation and sign-in users never cleared the `first_launch`
 * flag, so `RootLayoutContent` redirected them to `/welcome` on every cold
 * start — testers reported being "kicked out" repeatedly.
 *
 * The fix makes the gate auth-aware: a persisted Supabase session means the
 * user is past onboarding regardless of which path they took (and regardless
 * of a reinstall wiping the kv-store flag while the Keychain session survives).
 */
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '@/app/_layout';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace, back: jest.fn(), push: jest.fn() };

const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockOnAuthStateChange = jest.fn();
const mockIsFirstLaunch = jest.fn();
const mockCompleteFirstLaunch = jest.fn();

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null
}));

jest.mock('expo-updates', () => ({
  isEnabled: false,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn()
}));

jest.mock('expo-router', () => {
  const Stack = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  (Stack as { Screen?: () => null }).Screen = () => null;

  return {
    Stack,
    useRouter: () => mockRouter
  };
});

jest.mock('@/core/database', () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('@/core/watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined),
  subscribeToWatchMessages: jest.fn(() => jest.fn())
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
  // Auth is decided synchronously via INITIAL_SESSION below, so the storage
  // probe is not the deciding signal in these welcome-gate tests.
  hasPersistedSession: () => Promise.resolve(false)
}));

jest.mock('@/shared/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    isDark: false,
    theme: {
      primary: '#1A73E8',
      surface: '#FFFFFF',
      textPrimary: '#1F1F24',
      background: '#FFFFFF'
    }
  })
}));

/** The captured onAuthStateChange callback, for firing post-boot auth events. */
let capturedAuthCallback: ((event: string, session: unknown) => void) | undefined;

/**
 * Fire INITIAL_SESSION synchronously (Supabase's real behaviour for a valid or
 * absent session) with the given session, so the boot auth gate resolves at
 * once. Also captures the callback for later transitions (e.g. SIGNED_OUT).
 */
const emitInitialSession = (initialSession: unknown) => {
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: string, session: unknown) => void) => {
      capturedAuthCallback = callback;
      callback('INITIAL_SESSION', initialSession);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }
  );
};

describe('RootLayout welcome gate (auth-aware)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await changeAppLanguage('en');
    });
  });

  it('does NOT redirect a signed-in user to welcome, even when first_launch is unset', async () => {
    emitInitialSession({ user: { id: 'u1' } });
    mockIsFirstLaunch.mockReturnValue(true);

    render(<RootLayout />);

    // Signed-in users get the flag cleared so future launches skip the gate too.
    await waitFor(() => expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });

  it('redirects a signed-out first-launch user to welcome', async () => {
    emitInitialSession(null);
    mockIsFirstLaunch.mockReturnValue(true);

    render(<RootLayout />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/welcome'));
    expect(mockCompleteFirstLaunch).not.toHaveBeenCalled();
  });

  it('does NOT redirect a signed-out returning user (first_launch already cleared)', async () => {
    emitInitialSession(null);
    mockIsFirstLaunch.mockReturnValue(false);

    render(<RootLayout />);

    // getAllCards runs right after init completes — a reliable signal that the
    // layout finished bootstrapping and the gate effect has had a chance to run.
    await waitFor(() => expect(mockGetAllCards).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
    expect(mockCompleteFirstLaunch).not.toHaveBeenCalled();
  });

  it('does NOT bounce to welcome when a signed-in user signs out post-boot (reactive auth, first_launch already cleared)', async () => {
    // Boot signed-in: the gate clears first_launch. Model the real
    // completeFirstLaunch, which makes subsequent isFirstLaunch() return false.
    mockIsFirstLaunch.mockReturnValue(true);
    mockCompleteFirstLaunch.mockImplementation(() => mockIsFirstLaunch.mockReturnValue(false));
    emitInitialSession({ user: { id: 'u1' } });

    render(<RootLayout />);
    await waitFor(() => expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1));

    // isAuthenticated is reactive for the app's lifetime now (Story 16.10). A
    // later sign-out must NOT re-trigger the welcome gate — first_launch is
    // already cleared, so the returning-user path applies (no /welcome bounce).
    act(() => {
      capturedAuthCallback?.('SIGNED_OUT', null);
    });

    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });
});
