import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import ResetPasswordScreen from '../ResetPasswordScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

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
    layout: { safeAreaTopInsetMin: 16, screenHorizontalMargin: 24 },
    typography: {
      title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
      subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
      footnote: { fontSize: 13, lineHeight: 18 },
      caption1: { fontSize: 12, lineHeight: 16 }
    },
    touchTarget: { min: 44 },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockReplace = jest.fn();
const mockParams: Record<string, string | undefined> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams
}));

const mockUpdatePassword = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args)
}));

const mockSetSession = jest.fn();
jest.mock('@/shared/supabase/client', () => ({
  getSupabaseClient: () => ({
    auth: {
      setSession: mockSetSession
    }
  })
}));

const mockGetInitialURL = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
jest.mock('@/core/utils/get-initial-url', () => ({
  getInitialURL: () => mockGetInitialURL()
}));

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    mockGetInitialURL.mockResolvedValue(null);
  });

  it('shows invalid-link state when tokens are missing', async () => {
    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toBeTruthy();
    });
  });

  it('renders reset form when session is established', async () => {
    mockParams.access_token = 'token';
    mockParams.refresh_token = 'refresh';
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-screen')).toBeTruthy();
      expect(screen.getByTestId('password-input')).toBeTruthy();
      expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
    });
  });

  it('submits new password and shows success state', async () => {
    mockParams.access_token = 'token';
    mockParams.refresh_token = 'refresh';
    mockSetSession.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({ success: true, data: undefined });

    render(<ResetPasswordScreen />);

    await waitFor(() => expect(screen.getByTestId('update-password-button')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1!');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Password1!');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('Password1!');
      expect(screen.getByTestId('reset-password-success')).toBeTruthy();
    });
  });

  it('shows server error banner on update failure', async () => {
    mockParams.access_token = 'token';
    mockParams.refresh_token = 'refresh';
    mockSetSession.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({ success: false, error: { message: 'Server error' } });

    render(<ResetPasswordScreen />);

    await waitFor(() => expect(screen.getByTestId('update-password-button')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1!');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Password1!');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('Server error')).toBeTruthy();
    });
  });

  it('falls back to hash fragment tokens from initial URL', async () => {
    mockGetInitialURL.mockResolvedValue(
      'myloyaltycards://reset-password#access_token=hash-tok&refresh_token=hash-ref'
    );
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: 'hash-tok',
        refresh_token: 'hash-ref'
      });
    });
  });
});
