import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import NewPasswordScreen from './NewPasswordScreen';

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
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace })
}));

const mockUpdatePassword = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args)
}));

const fillPasswords = (password: string, confirm: string) => {
  fireEvent.changeText(screen.getByTestId('password-input'), password);
  fireEvent.changeText(screen.getByTestId('confirm-password-input'), confirm);
};

describe('NewPasswordScreen', () => {
  // PasswordInput trips a benign React 19 dev warning under testing-library
  // ("Expected static flag was missing"); suppress just that line so genuine
  // console errors still surface (mirrors the former ResetPasswordScreen test).
  const originalConsoleError = console.error;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Internal React error: Expected static flag was missing')
      ) {
        return;
      }

      originalConsoleError(...(args as Parameters<typeof console.error>));
    });
  });

  afterAll(() => {
    (console.error as jest.Mock).mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading, subtitle, both inputs and the submit button', () => {
    render(<NewPasswordScreen />);

    expect(screen.getByTestId('new-password-title')).toBeTruthy();
    expect(screen.getByText('Set New Password')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
    expect(screen.getByTestId('update-password-button')).toBeTruthy();
  });

  it('blocks submission and flags a weak password without calling updatePassword', async () => {
    render(<NewPasswordScreen />);

    fillPasswords('weak', 'weak');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(
        screen.getByText('Min 8 characters, at least one letter and one number.')
      ).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords without calling updatePassword', async () => {
    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass2');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('clears a field error once the user edits that field', async () => {
    render(<NewPasswordScreen />);

    fillPasswords('weak', 'weak');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(
        screen.getByText('Min 8 characters, at least one letter and one number.')
      ).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('password-input'), 'ValidPass1');

    await waitFor(() => {
      expect(
        screen.queryByText('Min 8 characters, at least one letter and one number.')
      ).toBeNull();
    });
  });

  it('clears the confirm-password field error once the user edits it', async () => {
    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass2');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'ValidPass1');

    await waitFor(() => {
      expect(screen.queryByText('Passwords do not match.')).toBeNull();
    });
  });

  it('shows the strength indicator only once a password is entered (AC6)', () => {
    render(<NewPasswordScreen />);

    expect(screen.queryByTestId('password-strength-indicator')).toBeNull();

    fireEvent.changeText(screen.getByTestId('password-input'), 'ValidPass1');

    expect(screen.getByTestId('password-strength-indicator')).toBeTruthy();
  });

  it('flags empty fields without calling updatePassword', async () => {
    render(<NewPasswordScreen />);

    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByText('Password is required.')).toBeTruthy();
      expect(screen.getByText('Please confirm your password.')).toBeTruthy();
    });
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it('updates the password and navigates to / on success', async () => {
    mockUpdatePassword.mockResolvedValue({ success: true, data: undefined });

    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('ValidPass1');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to a custom successHref on success (reuse hook for e.g. Settings)', async () => {
    mockUpdatePassword.mockResolvedValue({ success: true, data: undefined });

    render(<NewPasswordScreen successHref="/settings" />);

    fillPasswords('ValidPass1', 'ValidPass1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('ValidPass1');
      expect(mockReplace).toHaveBeenCalledWith('/settings');
    });
  });

  it('surfaces a mapped network error when the update fails for connectivity', async () => {
    mockUpdatePassword.mockResolvedValue({
      success: false,
      error: { message: 'Network request failed' }
    });

    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(
        screen.getByText('Unable to connect. Check your internet and try again.')
      ).toBeTruthy();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('surfaces a generic error for a non-network update failure', async () => {
    mockUpdatePassword.mockResolvedValue({
      success: false,
      error: { message: 'Password too weak' }
    });

    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  it('surfaces a generic error when updatePassword throws unexpectedly', async () => {
    mockUpdatePassword.mockRejectedValue(new Error('boom'));

    render(<NewPasswordScreen />);

    fillPasswords('ValidPass1', 'ValidPass1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });
});
