/**
 * ForgotPasswordScreen — Unit Tests
 * Story 6-8: Password Reset
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import ForgotPasswordScreen from '../ForgotPasswordScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FFFFFF',
      surface: '#FAFAFA',
      textPrimary: '#000000',
      textSecondary: '#666666',
      primary: '#1A73E8',
      primaryDark: '#5c9a5c',
      border: '#E5E7EB'
    },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush })
}));

const mockRequestPasswordReset = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args)
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Rendering ----

  it('renders the screen container', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('forgot-password-screen')).toBeTruthy();
  });

  it('renders the title', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('forgot-password-title')).toBeTruthy();
    expect(screen.getByTestId('forgot-password-title').props.children).toBe('Forgot Password?');
  });

  it('renders email input', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
  });

  it('renders send reset button', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('send-reset-button')).toBeTruthy();
  });

  it('renders back to sign in link', () => {
    render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('back-to-sign-in-link')).toBeTruthy();
  });

  // ---- Validation ----

  it('shows email error when email is empty on submit', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('send-reset-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
  });

  it('shows email error for invalid email format', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.press(screen.getByTestId('send-reset-button'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('clears email error on input change', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('send-reset-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('email-input'), 'a');
    expect(screen.queryByTestId('email-error')).toBeNull();
  });

  it('does not call requestPasswordReset when validation fails', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('send-reset-button'));
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  // ---- Successful submission ----

  it('shows confirmation screen on success', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-confirmation')).toBeTruthy();
      expect(screen.getByTestId('confirmation-title')).toBeTruthy();
    });
  });

  it('trims whitespace from email before submitting', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), '  test@example.com  ');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });
  });

  it('confirmation screen has a back to sign in button', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('back-to-sign-in-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('back-to-sign-in-button'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('Try Again button resets to form view', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('try-again-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('try-again-button'));

    // Should be back at the form view
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('send-reset-button')).toBeTruthy();
  });

  // ---- Error handling ----

  it('displays server error message on requestPasswordReset failure', async () => {
    mockRequestPasswordReset.mockResolvedValue({
      success: false,
      error: { message: 'Rate limit exceeded' }
    });

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('Rate limit exceeded')).toBeTruthy();
    });
  });

  it('displays generic error when requestPasswordReset throws', async () => {
    mockRequestPasswordReset.mockRejectedValue(new Error('Network failure'));

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  // ---- Navigation ----

  it('navigates back when back to sign in link is pressed', () => {
    render(<ForgotPasswordScreen />);
    fireEvent.press(screen.getByTestId('back-to-sign-in-link'));
    expect(mockBack).toHaveBeenCalled();
  });

  // ---- Loading state ----

  it('shows loading indicator while submitting', async () => {
    let resolve: (v: unknown) => void;
    mockRequestPasswordReset.mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        })
    );

    render(<ForgotPasswordScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    // Resolve to clean up
    resolve!({ success: true, data: undefined });
  });
});
