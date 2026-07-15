import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import ForgotPasswordScreen from './ForgotPasswordScreen';

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

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush })
}));

const mockSendPasswordResetOtp = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  sendPasswordResetOtp: (...args: unknown[]) => mockSendPasswordResetOtp(...args)
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reset heading, instruction and controls', () => {
    render(<ForgotPasswordScreen />);

    expect(screen.getByTestId('forgot-password-title')).toBeTruthy();
    expect(screen.getByText('Forgot Password?')).toBeTruthy();
    expect(screen.getByTestId('forgot-password-back-chevron')).toBeTruthy();
    expect(screen.getByTestId('send-reset-button')).toBeTruthy();
    expect(screen.getByTestId('back-to-sign-in-link')).toBeTruthy();
  });

  it('navigates back via chevron and back-to-sign-in link', () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByTestId('forgot-password-back-chevron'));
    fireEvent.press(screen.getByTestId('back-to-sign-in-link'));

    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('blocks an empty email and never calls the send API', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeTruthy();
    });
    expect(mockSendPasswordResetOtp).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('blocks a malformed email and never calls the send API', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });
    expect(mockSendPasswordResetOtp).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('clears the email field error once the user edits the field', async () => {
    render(<ForgotPasswordScreen />);

    fireEvent.press(screen.getByTestId('send-reset-button'));
    await waitFor(() => {
      expect(screen.getByText('Email is required.')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('email-input'), 'a');

    await waitFor(() => {
      expect(screen.queryByText('Email is required.')).toBeNull();
    });
  });

  it('sends the reset code and navigates to the recovery OTP screen with email + sentAt', async () => {
    mockSendPasswordResetOtp.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('test@example.com');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/recovery-otp',
        params: { email: 'test@example.com', sentAt: expect.any(String) }
      });
    });
  });

  it('trims surrounding whitespace from the email before sending and navigating', async () => {
    mockSendPasswordResetOtp.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), '  test@example.com  ');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('test@example.com');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/recovery-otp',
        params: { email: 'test@example.com', sentAt: expect.any(String) }
      });
    });
  });

  it('shows a mapped network error instead of the raw backend message', async () => {
    mockSendPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { message: 'Network request failed' }
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(
        screen.getByText('Unable to connect. Check your internet and try again.')
      ).toBeTruthy();
    });
  });

  it('shows a generic error when send fails with a non-network message', async () => {
    mockSendPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { message: 'Something unexpected happened' }
    });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows generic translated error when send-reset throws unexpectedly', async () => {
    mockSendPasswordResetOtp.mockRejectedValue(new Error('Unexpected failure'));

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });
});
