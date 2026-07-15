import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import VerifyEmailScreen from './VerifyEmailScreen';

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

const mockVerifyEmailOtp = jest.fn();
const mockResendVerificationEmail = jest.fn();
const mockVerifyPasswordResetOtp = jest.fn();
const mockSendPasswordResetOtp = jest.fn();

jest.mock('@/shared/supabase/auth', () => ({
  verifyEmailOtp: (...args: unknown[]) => mockVerifyEmailOtp(...args),
  resendVerificationEmail: (...args: unknown[]) => mockResendVerificationEmail(...args),
  verifyPasswordResetOtp: (...args: unknown[]) => mockVerifyPasswordResetOtp(...args),
  sendPasswordResetOtp: (...args: unknown[]) => mockSendPasswordResetOtp(...args)
}));

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
    mockParams.email = 'test@example.com';
    mockParams.sentAt = String(Date.now() + sentAtSeed++);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the email subtitle and single OTP field', () => {
    render(<VerifyEmailScreen />);

    expect(screen.getByText('Verify your email')).toBeTruthy();
    expect(screen.getByText('We sent an 8-digit code to test@example.com')).toBeTruthy();
    expect(screen.getByTestId('otp-input')).toBeTruthy();
  });

  // Regression guard (Story 6.19): parametrizing this screen must NOT change the
  // default. With no `purpose` prop it must remain the signup email-verify flow —
  // the recovery API must never be reached, and success still lands on home.
  it('defaults to the signup purpose — uses the email-verify API, not recovery', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith('test@example.com', '12345678');
      expect(mockDismissTo).toHaveBeenCalledWith('/');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
    expect(mockVerifyPasswordResetOtp).not.toHaveBeenCalled();
    expect(mockSendPasswordResetOtp).not.toHaveBeenCalled();
  });

  it('auto-submits on the eighth digit and navigates home on success', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<VerifyEmailScreen />);

    const input = screen.getByTestId('otp-input');

    fireEvent.changeText(input, '1');
    fireEvent.changeText(input, '12');
    fireEvent.changeText(input, '123');
    fireEvent.changeText(input, '1234');
    fireEvent.changeText(input, '12345');
    fireEvent.changeText(input, '123456');
    fireEvent.changeText(input, '1234567');
    fireEvent.changeText(input, '12345678');

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith('test@example.com', '12345678');
      expect(mockDismissTo).toHaveBeenCalledWith('/');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('accepts a full 8-digit paste and auto-submits', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '87654321');

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith('test@example.com', '87654321');
    });
  });

  it('sanitizes a formatted 8-digit paste before auto-submitting', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '1234 5678');

    await waitFor(() => {
      expect(mockVerifyEmailOtp).toHaveBeenCalledWith('test@example.com', '12345678');
    });
  });

  it('shows wrong OTP error and clears it on edit', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: false,
      error: { code: 'invalid_otp', message: 'bad code' }
    });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(screen.getByText('Incorrect code. Please try again.')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('otp-input'), '1234567');

    await waitFor(() => {
      expect(screen.queryByText('Incorrect code. Please try again.')).toBeNull();
    });
  });

  it('shows expired error state and allows resend immediately', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: false,
      error: { code: 'expired_otp', message: 'expired' }
    });
    mockResendVerificationEmail.mockResolvedValue({ success: true, data: undefined });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(screen.getByText('This code has expired. Please request a new one.')).toBeTruthy();
      expect(screen.getByText('Resend code')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('resend-code-button'));

    await waitFor(() => {
      expect(mockResendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('keeps resend enabled after expired OTP when the screen remounts for the same flow', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: false,
      error: { code: 'expired_otp', message: 'expired' }
    });

    const view = render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(screen.getByText('This code has expired. Please request a new one.')).toBeTruthy();
      expect(screen.getByText('Resend code')).toBeTruthy();
    });

    view.unmount();

    render(<VerifyEmailScreen />);

    expect(screen.getByText('Resend code')).toBeTruthy();
  });

  it('shows network verification error banner', async () => {
    mockVerifyEmailOtp.mockResolvedValue({
      success: false,
      error: { code: 'network_error', message: 'offline' }
    });

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't verify right now. Check your connection and try again.")
      ).toBeTruthy();
    });
  });

  it('tracks resend cooldown and restarts it after successful resend', async () => {
    mockResendVerificationEmail.mockResolvedValue({ success: true, data: undefined });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-29T12:00:00.000Z'));
    mockParams.sentAt = String(Date.now());

    render(<VerifyEmailScreen />);

    expect(screen.getByText('Resend in 1:00')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(18000);
    });

    expect(screen.getByText('Resend in 0:42')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(42000);
    });

    expect(screen.getByText('Resend code')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('resend-code-button'));
    });

    expect(mockResendVerificationEmail).toHaveBeenCalledWith('test@example.com');
    // Signup resend must use the signup API only, never the recovery send.
    expect(mockSendPasswordResetOtp).not.toHaveBeenCalled();
    expect(screen.getByText('Code resent. Enter the newest code from your email.')).toBeTruthy();

    expect(screen.getByText('Resend in 1:00')).toBeTruthy();

    jest.useRealTimers();
  });

  it('redirects to create-account when email param is missing', async () => {
    delete mockParams.email;

    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/create-account');
    });
  });

  it('redirects to create-account when email param is invalid', async () => {
    mockParams.email = 'not-an-email';

    render(<VerifyEmailScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/create-account');
    });
  });

  it('shows resend failure and leaves cooldown unchanged', async () => {
    mockParams.email = 'failure@example.com';
    mockParams.sentAt = String(Date.now() - 60_000);
    mockResendVerificationEmail.mockResolvedValue({
      success: false,
      error: { message: 'rate limited' }
    });

    render(<VerifyEmailScreen />);

    fireEvent.press(screen.getByTestId('resend-code-button'));

    await waitFor(() => {
      expect(mockResendVerificationEmail).toHaveBeenCalledWith('failure@example.com');
      expect(screen.getByText("Couldn't resend code. Try again.")).toBeTruthy();
    });

    expect(screen.getByText('Resend code')).toBeTruthy();
  });

  it('returns to create-account with preserved email from wrong-email link', () => {
    render(<VerifyEmailScreen />);

    fireEvent.press(screen.getByTestId('wrong-email-link'));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/create-account',
      params: { email: 'test@example.com' }
    });
  });

  it('does not fire a second verify while one is already in flight', async () => {
    let resolveVerify: (value: unknown) => void = () => {};
    mockVerifyEmailOtp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        })
    );

    render(<VerifyEmailScreen />);

    fireEvent.changeText(screen.getByTestId('otp-input'), '12345678');
    await waitFor(() => expect(mockVerifyEmailOtp).toHaveBeenCalledTimes(1));

    // A manual confirm press while the first verify is still pending must be a
    // no-op (guarded by loading / isVerifyingRef) — no duplicate network call.
    fireEvent.press(screen.getByTestId('confirm-code-button'));
    expect(mockVerifyEmailOtp).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveVerify({
        success: true,
        data: { user: { id: 'u1' }, session: { access_token: 't' } }
      });
    });
  });

  it('does not resend while the cooldown is still running', () => {
    // beforeEach seeds a fresh sentAt, so the 60s cooldown is active on mount.
    render(<VerifyEmailScreen />);

    expect(screen.getByText(/Resend in/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('resend-code-button'));

    expect(mockResendVerificationEmail).not.toHaveBeenCalled();
  });

  it('starts a fresh 60s cooldown when the sentAt param is missing', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    delete mockParams.sentAt;

    render(<VerifyEmailScreen />);

    expect(screen.getByText('Resend in 1:00')).toBeTruthy();

    jest.useRealTimers();
  });

  it('sanitizes a mixed paste to digits and does not auto-submit below 8 digits', () => {
    render(<VerifyEmailScreen />);

    const input = screen.getByTestId('otp-input');
    fireEvent.changeText(input, 'ab12cd34e');

    expect(input.props.value).toBe('1234');
    expect(mockVerifyEmailOtp).not.toHaveBeenCalled();
  });
});
