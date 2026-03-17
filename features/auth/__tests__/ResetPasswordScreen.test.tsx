/**
 * ResetPasswordScreen — Unit Tests
 * Story 6-8: Password Reset
 */

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import React from 'react';

import ResetPasswordScreen from '../ResetPasswordScreen';

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
      primary: '#73A973',
      primaryDark: '#5c9a5c',
      border: '#E5E7EB'
    },
    isDark: false,
    colorScheme: 'light'
  })
}));

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams
}));

let mockParams: Record<string, string | undefined> = {};

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

// Mock getInitialURL for hash fragment fallback tests
const mockGetInitialURL = jest.fn<Promise<string | null>, []>().mockResolvedValue(null);
jest.mock('@/core/utils/get-initial-url', () => ({
  getInitialURL: (...args: unknown[]) => mockGetInitialURL(...args)
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillForm = (pw = 'Password1', confirmPw = 'Password1') => {
  fireEvent.changeText(screen.getByTestId('password-input'), pw);
  fireEvent.changeText(screen.getByTestId('confirm-password-input'), confirmPw);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockGetInitialURL.mockResolvedValue(null);
  });

  // ---- Session error states ----

  it('shows error when no tokens are present', async () => {
    mockParams = {};
    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toBeTruthy();
    });
  });

  // TODO: Fix mock for getInitialURL — skipped until Linking mock strategy is resolved
  it.skip('falls back to hash fragment tokens from Linking.getInitialURL', async () => {
    mockParams = {};
    mockGetInitialURL.mockResolvedValue(
      'myloyaltycards://reset-password#access_token=hash-tok&refresh_token=hash-ref'
    );
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    // Flush micro-task queue: getInitialURL → parseHashParams → setSession
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockGetInitialURL).toHaveBeenCalled();
    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'hash-tok',
      refresh_token: 'hash-ref'
    });
    expect(screen.getByTestId('reset-password-screen')).toBeTruthy();
  });

  // TODO: Fix mock for getInitialURL — skipped until Linking mock strategy is resolved
  it.skip('shows error from hash fragment error_description', async () => {
    mockParams = {};
    mockGetInitialURL.mockResolvedValue(
      'myloyaltycards://reset-password#error_description=Token%20expired'
    );

    render(<ResetPasswordScreen />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(screen.getByTestId('reset-password-error')).toBeTruthy();
    expect(screen.getByText('Token expired')).toBeTruthy();
  });

  it('shows error when URL carries error_description', async () => {
    mockParams = { error_description: 'Token expired' };
    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toBeTruthy();
      expect(screen.getByText('Token expired')).toBeTruthy();
    });
  });

  it('shows error when setSession fails', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: { message: 'Invalid token' } });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-error')).toBeTruthy();
    });
  });

  it('shows request new link button on error state', async () => {
    mockParams = {};
    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('request-new-link-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('request-new-link-button'));
    expect(mockReplace).toHaveBeenCalledWith('/forgot-password');
  });

  // ---- Successful session establishment ----

  it('shows password form when session is established', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('reset-password-screen')).toBeTruthy();
      expect(screen.getByTestId('reset-password-title')).toBeTruthy();
    });
  });

  it('renders password and confirm password inputs', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
      expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
    });
  });

  // ---- Validation ----

  it('shows password error when password is empty', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('update-password-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('update-password-button'));

    expect(screen.getByTestId('password-error')).toBeTruthy();
    expect(screen.getByText('Password is required.')).toBeTruthy();
  });

  it('shows error for weak password', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('password-input'), 'weak');
    fireEvent.press(screen.getByTestId('update-password-button'));

    expect(screen.getByText('Min 8 characters, at least one letter and one number.')).toBeTruthy();
  });

  it('shows error when passwords do not match', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fillForm('Password1', 'Password2');
    fireEvent.press(screen.getByTestId('update-password-button'));

    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('shows error when confirm password is empty', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('update-password-button'));

    expect(screen.getByText('Please confirm your password.')).toBeTruthy();
  });

  it('does not call updatePassword when validation fails', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('update-password-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('update-password-button'));
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  // ---- Successful password update ----

  it('calls updatePassword and shows success on valid form', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({ success: true, data: undefined });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fillForm();
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('Password1');
      expect(screen.getByTestId('reset-password-success')).toBeTruthy();
    });
  });

  // ---- Error handling ----

  it('shows server error when updatePassword fails', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });
    mockUpdatePassword.mockResolvedValue({
      success: false,
      error: { message: 'Password too weak' }
    });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fillForm();
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('Password too weak')).toBeTruthy();
    });
  });

  it('shows generic error when updatePassword throws', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });
    mockUpdatePassword.mockRejectedValue(new Error('Network failure'));

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fillForm();
    fireEvent.press(screen.getByTestId('update-password-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  // ---- Field error clearing ----

  it('clears password error on input change', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('update-password-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('update-password-button'));
    expect(screen.getByTestId('password-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('password-input'), 'a');
    expect(screen.queryByTestId('password-error')).toBeNull();
  });

  it('clears confirm password error on input change', async () => {
    mockParams = { access_token: 'tok', refresh_token: 'ref' };
    mockSetSession.mockResolvedValue({ error: null });

    render(<ResetPasswordScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('password-input')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('update-password-button'));
    expect(screen.getByTestId('confirm-password-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'a');
    expect(screen.queryByTestId('confirm-password-error')).toBeNull();
  });
});
