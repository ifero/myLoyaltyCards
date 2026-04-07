import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import SignInScreen from '../SignInScreen';

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
      footnote: { fontSize: 13, lineHeight: 18 }
    },
    touchTarget: { min: 44 },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));

const mockSignInWithEmail = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args)
}));

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders app icon and welcome heading', () => {
    render(<SignInScreen />);

    expect(screen.getByTestId('auth-app-icon')).toBeTruthy();
    expect(screen.getByTestId('sign-in-title')).toBeTruthy();
    expect(screen.getByText('Welcome Back')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    render(<SignInScreen />);

    fireEvent.press(screen.getByTestId('password-input-toggle'));
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  it('renders mapped human-readable error banner on auth failure', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: false,
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' }
    });

    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('Incorrect email or password. Please try again.')).toBeTruthy();
    });
  });

  it('navigates to forgot-password and create-account links', () => {
    render(<SignInScreen />);

    fireEvent.press(screen.getByTestId('forgot-password-link'));
    fireEvent.press(screen.getByTestId('create-account-link'));

    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
    expect(mockPush).toHaveBeenCalledWith('/create-account');
  });

  it('submits successfully and redirects home', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'Password1');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
