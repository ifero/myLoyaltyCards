import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../global.css', () => ({}));

import { changeAppLanguage } from '@/shared/i18n';

import RootLayout from '../_layout';

const mockInitializeDatabase = jest.fn();
const mockGetAllCards = jest.fn().mockResolvedValue([]);
const mockPushCardsToWatch = jest.fn().mockResolvedValue(undefined);
const mockSubscribeToWatchMessages = jest.fn(() => jest.fn());
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
  getSupabaseClient: jest.fn(() => ({}))
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
