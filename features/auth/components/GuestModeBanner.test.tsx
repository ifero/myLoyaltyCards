import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { GuestModeBanner } from './GuestModeBanner';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      backgroundSubtle: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceElevated: '#F5F5F5',
      textPrimary: '#1F1F24',
      textSecondary: '#66666B',
      textTertiary: '#8F8F94',
      primary: '#1A73E8',
      primaryDark: '#1967D2',
      border: '#E5E5EB',
      error: '#FF3B30',
      warning: '#D97706',
      success: '#16A34A',
      link: '#1A73E8'
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    touchTarget: { min: 44 },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('GuestModeBanner', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('renders shield icon, headline, subtitle and CTAs', async () => {
    render(<GuestModeBanner isGuestMode />);

    await waitFor(() => {
      expect(screen.getByTestId('guest-mode-banner')).toBeTruthy();
      expect(screen.getByText('Protect your cards')).toBeTruthy();
      expect(screen.getByText(/Create a free account to back up your cards/i)).toBeTruthy();
      expect(screen.getByTestId('guest-mode-banner-create-account')).toBeTruthy();
      expect(screen.getByTestId('guest-mode-banner-sign-in')).toBeTruthy();
    });
  });

  it('navigates to create-account and sign-in', async () => {
    render(<GuestModeBanner isGuestMode />);

    await waitFor(() => expect(screen.getByTestId('guest-mode-banner')).toBeTruthy());

    fireEvent.press(screen.getByTestId('guest-mode-banner-create-account'));
    fireEvent.press(screen.getByTestId('guest-mode-banner-sign-in'));

    expect(mockPush).toHaveBeenCalledWith('/create-account');
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('dismisses banner and persists hidden state', async () => {
    render(<GuestModeBanner isGuestMode />);

    await waitFor(() => expect(screen.getByTestId('guest-mode-banner')).toBeTruthy());

    fireEvent.press(screen.getByTestId('guest-mode-banner-dismiss-button'));

    await waitFor(() => {
      expect(screen.queryByTestId('guest-mode-banner')).toBeNull();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('guest_banner_dismissed', '1');
    });
  });

  it('does not render when previously dismissed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1');

    render(<GuestModeBanner isGuestMode />);

    await waitFor(() => {
      expect(screen.queryByTestId('guest-mode-banner')).toBeNull();
    });
  });

  it('does not render when not in guest mode', async () => {
    render(<GuestModeBanner isGuestMode={false} />);

    await waitFor(() => {
      expect(screen.queryByTestId('guest-mode-banner')).toBeNull();
    });
  });

  // Story 22.2 — Home's banners sit on the card grid's 16pt margin, in line with the tiles.
  it('sits on the 16pt grid margin', async () => {
    render(<GuestModeBanner isGuestMode />);

    await waitFor(() => expect(screen.getByTestId('guest-mode-banner')).toBeTruthy());
    expect(
      StyleSheet.flatten(screen.getByTestId('guest-mode-banner').props.style).marginHorizontal
    ).toBe(16);
  });

  // Story 22.2 — both actions are outlined. A filled primary is beam in dark mode, and no
  // beam-filled surface may sit above the grid; outlined in light too, so the pair reads alike.
  it.each(['guest-mode-banner-create-account', 'guest-mode-banner-sign-in'])(
    'draws %s as an outlined secondary button, not a filled one',
    async (testID) => {
      render(<GuestModeBanner isGuestMode />);

      await waitFor(() => expect(screen.getByTestId(testID)).toBeTruthy());
      expect(
        StyleSheet.flatten(screen.getByTestId(`${testID}-container`).props.style)
      ).toMatchObject({ backgroundColor: 'transparent', borderWidth: 1, borderColor: '#1A73E8' });
    }
  );
});
