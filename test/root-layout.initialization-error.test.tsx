import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '@/app/_layout';

const mockInitializeDatabase = jest.fn();
const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockPushCardsToWatch = jest.fn().mockResolvedValue(undefined);
const mockSubscribeToWatchMessages = jest.fn((listener?: unknown) => {
  void listener;
  return jest.fn();
});
const mockRouter = {
  replace: jest.fn(),
  back: jest.fn(),
  push: jest.fn()
};

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
  initializeDatabase: (...args: unknown[]) => mockInitializeDatabase(...args)
}));

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('@/core/watch-connectivity', () => ({
  pushCardsToWatch: (...args: unknown[]) => mockPushCardsToWatch(...args),
  subscribeToWatchMessages: (listener: unknown) => mockSubscribeToWatchMessages(listener)
}));

jest.mock('@/core/auth/guest-session-repository', () => ({
  getOrCreateGuestSessionId: jest.fn().mockResolvedValue('guest-1')
}));

jest.mock('@/features/settings', () => ({
  isFirstLaunch: () => false
}));

jest.mock('@/shared/supabase/client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        // Boot auth gate resolves from the synchronous INITIAL_SESSION (no network).
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }
    }
  })),
  hasPersistedSession: () => Promise.resolve(false)
}));

jest.mock('@/shared/theme', () => {
  return {
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
  };
});

describe('RootLayout initialization error localization', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await act(async () => {
      await changeAppLanguage('en');
    });
  });

  it('shows localized English fallback copy and hides raw Error details', async () => {
    mockInitializeDatabase.mockRejectedValueOnce(new Error('Database exploded'));

    render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByText('Database Error')).toBeTruthy();
      expect(screen.getByText('Initialization failed')).toBeTruthy();
    });

    expect(screen.queryByText('Database exploded')).toBeNull();
  });

  // Story 16.24 (AC5): the boot effect stores a translation KEY and the message is
  // translated at render, so a language change AFTER a failed initialisation
  // re-renders it in the new language. Against the pre-16.24 code — which called
  // `t(...)` inside the effect and stored the resulting STRING — this fails: the
  // message stays in the language that was active at mount.
  it('re-translates the boot-failure message when the language changes after the failure', async () => {
    mockInitializeDatabase.mockRejectedValueOnce(new Error('Database exploded'));

    render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByText('Initialization failed')).toBeTruthy();
    });

    await act(async () => {
      await changeAppLanguage('it');
    });

    await waitFor(() => {
      expect(screen.getByText('Inizializzazione non riuscita')).toBeTruthy();
    });
    expect(screen.queryByText('Initialization failed')).toBeNull();
  });

  // Story 16.24 (AC6): the effect's dep array is honestly `[]`, so a language
  // change must not re-run database initialisation or churn the watch subscription.
  it('does not re-run initialisation or resubscribe when the language changes', async () => {
    mockInitializeDatabase.mockResolvedValue(undefined);

    render(<RootLayout />);

    await waitFor(() => {
      expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
    });
    const subscriptionsAfterBoot = mockSubscribeToWatchMessages.mock.calls.length;

    await act(async () => {
      await changeAppLanguage('it');
    });
    await act(async () => {
      await changeAppLanguage('en');
    });

    expect(mockInitializeDatabase).toHaveBeenCalledTimes(1);
    expect(mockSubscribeToWatchMessages.mock.calls.length).toBe(subscriptionsAfterBoot);
  });

  it('shows localized Italian fallback copy for non-Error failures', async () => {
    await act(async () => {
      await changeAppLanguage('it');
    });

    mockInitializeDatabase.mockRejectedValueOnce('Database exploded');

    render(<RootLayout />);

    await waitFor(() => {
      expect(screen.getByText('Errore database')).toBeTruthy();
      expect(screen.getByText('Inizializzazione non riuscita')).toBeTruthy();
    });

    expect(screen.queryByText('Database exploded')).toBeNull();
  });
});
