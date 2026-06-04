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

jest.mock('../../global.css', () => ({}));

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '../_layout';

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace, back: jest.fn(), push: jest.fn() };

const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockGetSession = jest.fn();
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
    auth: { getSession: () => mockGetSession() }
  }))
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

describe('RootLayout welcome gate (auth-aware)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await changeAppLanguage('en');
    });
  });

  it('does NOT redirect a signed-in user to welcome, even when first_launch is unset', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    mockIsFirstLaunch.mockReturnValue(true);

    render(<RootLayout />);

    // Signed-in users get the flag cleared so future launches skip the gate too.
    await waitFor(() => expect(mockCompleteFirstLaunch).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });

  it('redirects a signed-out first-launch user to welcome', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockIsFirstLaunch.mockReturnValue(true);

    render(<RootLayout />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/welcome'));
    expect(mockCompleteFirstLaunch).not.toHaveBeenCalled();
  });

  it('does NOT redirect a signed-out returning user (first_launch already cleared)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockIsFirstLaunch.mockReturnValue(false);

    render(<RootLayout />);

    // getAllCards runs right after init completes — a reliable signal that the
    // layout finished bootstrapping and the gate effect has had a chance to run.
    await waitFor(() => expect(mockGetAllCards).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
    expect(mockCompleteFirstLaunch).not.toHaveBeenCalled();
  });
});
