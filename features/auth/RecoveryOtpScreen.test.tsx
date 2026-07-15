import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import RecoveryOtpScreen from './RecoveryOtpScreen';

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

const mockDismissTo = jest.fn();
const mockReplace = jest.fn();
const mockParams: Record<string, string | undefined> = {};
let sentAtSeed = 0;

jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissTo: mockDismissTo, replace: mockReplace }),
  useLocalSearchParams: () => mockParams
}));

const mockVerifyPasswordResetOtp = jest.fn();
const mockSendPasswordResetOtp = jest.fn();
const mockVerifyEmailOtp = jest.fn();
const mockResendVerificationEmail = jest.fn();

jest.mock('@/shared/supabase/auth', () => ({
  verifyEmailOtp: (...args: unknown[]) => mockVerifyEmailOtp(...args),
  resendVerificationEmail: (...args: unknown[]) => mockResendVerificationEmail(...args),
  verifyPasswordResetOtp: (...args: unknown[]) => mockVerifyPasswordResetOtp(...args),
  sendPasswordResetOtp: (...args: unknown[]) => mockSendPasswordResetOtp(...args)
}));

describe('RecoveryOtpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    mockParams.email = 'test@example.com';
    mockParams.sentAt = String(Date.now() + sentAtSeed++);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the recovery heading and email subtitle', () => {
    render(<RecoveryOtpScreen />);

    expect(screen.getByText('Reset your password')).toBeTruthy();
    expect(screen.getByText('We sent an 8-digit code to test@example.com')).toBeTruthy();
    expect(screen.getByTestId('otp-input')).toBeTruthy();
  });

  it('auto-submits the recovery code and navigates to the new-password screen', async () => {
    mockVerifyPasswordResetOtp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<RecoveryOtpScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(mockVerifyPasswordResetOtp).toHaveBeenCalledWith('test@example.com', '12345678');
      // AC7: clear the pushed forgot-password + recovery-otp screens off the
      // back stack (dismissTo) before showing the new-password screen (replace).
      expect(mockDismissTo).toHaveBeenCalledWith('/');
      expect(mockReplace).toHaveBeenCalledWith('/new-password');
    });
    // Recovery must NOT reach the signup email-verify API.
    expect(mockVerifyEmailOtp).not.toHaveBeenCalled();
  });

  it('shows the incorrect-code error on an invalid OTP and clears it on edit', async () => {
    mockVerifyPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { code: 'invalid_otp', message: 'bad code' }
    });

    render(<RecoveryOtpScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(screen.getByText('Incorrect code. Please try again.')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('otp-input'), '1234567');

    await waitFor(() => {
      expect(screen.queryByText('Incorrect code. Please try again.')).toBeNull();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the expired-code state and re-sends via sendPasswordResetOtp', async () => {
    mockVerifyPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { code: 'expired_otp', message: 'expired' }
    });
    mockSendPasswordResetOtp.mockResolvedValue({ success: true, data: undefined });

    render(<RecoveryOtpScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(screen.getByText('This code has expired. Please request a new one.')).toBeTruthy();
      expect(screen.getByText('Resend code')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('resend-code-button'));

    await waitFor(() => {
      expect(mockSendPasswordResetOtp).toHaveBeenCalledWith('test@example.com');
      expect(mockResendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  it('shows a network banner when verification fails for connectivity', async () => {
    mockVerifyPasswordResetOtp.mockResolvedValue({
      success: false,
      error: { code: 'network_error', message: 'offline' }
    });

    render(<RecoveryOtpScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't verify right now. Check your connection and try again.")
      ).toBeTruthy();
    });
  });

  it('redirects to forgot-password when the email param is missing', async () => {
    delete mockParams.email;

    render(<RecoveryOtpScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
    });
  });

  it('redirects to forgot-password when the email param is invalid', async () => {
    mockParams.email = 'not-an-email';

    render(<RecoveryOtpScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
    });
  });

  it('returns to forgot-password (no params) from the wrong-email link', () => {
    render(<RecoveryOtpScreen />);

    fireEvent.press(screen.getByTestId('wrong-email-link'));

    expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
  });

  it('tracks the resend cooldown seeded from sentAt', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    mockParams.sentAt = String(Date.now());

    render(<RecoveryOtpScreen />);

    expect(screen.getByText('Resend in 1:00')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(18000);
    });

    expect(screen.getByText('Resend in 0:42')).toBeTruthy();
  });
});
