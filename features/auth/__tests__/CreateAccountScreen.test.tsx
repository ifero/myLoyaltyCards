/**
 * CreateAccountScreen — Unit Tests
 * Story 6-6: Create Account with Email
 * Story 6-11: Privacy & Consent (register button disabled, consent persisted)
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import CreateAccountScreen from '../CreateAccountScreen';

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
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() })
}));

const mockSignUp = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args)
}));

const mockSetConsentGiven = jest.fn();
jest.mock('@/core/privacy/consent-repository', () => ({
  setConsentGiven: () => mockSetConsentGiven()
}));

// ConsentCheckbox mock — render a simple pressable toggle
jest.mock('@/shared/components/ConsentCheckbox', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mockRN = require('react-native');
  return {
    __esModule: true,
    default: ({ checked, onToggle }: { checked: boolean; onToggle: (v: boolean) => void }) =>
      mockReact.createElement(
        mockRN.Pressable,
        { testID: 'consent-checkbox-toggle', onPress: () => onToggle(!checked) },
        mockReact.createElement(mockRN.Text, null, checked ? 'checked' : 'unchecked')
      )
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillForm = (
  emailValue = 'test@example.com',
  passwordValue = 'Password1',
  confirmPasswordValue = 'Password1'
) => {
  fireEvent.changeText(screen.getByTestId('email-input'), emailValue);
  fireEvent.changeText(screen.getByTestId('password-input'), passwordValue);
  fireEvent.changeText(screen.getByTestId('confirm-password-input'), confirmPasswordValue);
  // Toggle consent on
  fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CreateAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Rendering ----

  it('renders the screen container', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('create-account-screen')).toBeTruthy();
  });

  it('renders the title', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('create-account-title')).toBeTruthy();
    expect(screen.getByText('Create Account')).toBeTruthy();
  });

  it('renders all form fields', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
  });

  it('renders the consent checkbox', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('consent-checkbox-toggle')).toBeTruthy();
  });

  it('renders the register button', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('register-button')).toBeTruthy();
  });

  it('shows password requirements hint', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByTestId('password-requirements')).toBeTruthy();
  });

  it('has proper accessibility labels on inputs', () => {
    render(<CreateAccountScreen />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm password')).toBeTruthy();
  });

  // ---- Validation ----

  it('shows email error when email is empty on submit', () => {
    render(<CreateAccountScreen />);
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
  });

  it('shows email error for invalid email format', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('shows password error when password is empty', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Password is required.')).toBeTruthy();
  });

  it('shows password error for weak password', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'short');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Min 8 characters, at least one letter and one number.')).toBeTruthy();
  });

  it('shows confirm password error when passwords do not match', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Different1');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
  });

  it('register button is disabled when consent not agreed (prevents submission)', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Password1');
    // Do NOT toggle consent — button should remain disabled
    const button = screen.getByTestId('register-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(button);
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('clears email error on input change', () => {
    render(<CreateAccountScreen />);
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('email-input'), 'a');
    expect(screen.queryByTestId('email-error')).toBeNull();
  });

  it('clears password error on input change', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByTestId('password-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('password-input'), 'a');
    expect(screen.queryByTestId('password-error')).toBeNull();
  });

  it('clears confirm password error on input change', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Diff');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByTestId('confirm-password-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'x');
    expect(screen.queryByTestId('confirm-password-error')).toBeNull();
  });

  // ---- Successful registration ----

  it('calls signUp and redirects on success', async () => {
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password1');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('shows confirmation message and does not redirect when session is null', async () => {
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: null }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password1');
      expect(mockReplace).not.toHaveBeenCalled();
      expect(screen.getByText(/check your email to confirm/i)).toBeTruthy();
    });
  });

  it('does not call signUp when validation fails', () => {
    render(<CreateAccountScreen />);
    fireEvent.press(screen.getByTestId('register-button'));
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // ---- Error handling ----

  it('displays server error message on signUp failure', async () => {
    mockSignUp.mockResolvedValue({
      success: false,
      error: { message: 'User already registered' }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('User already registered')).toBeTruthy();
    });
  });

  it('displays generic error when signUp throws', async () => {
    mockSignUp.mockRejectedValue(new Error('Network failure'));

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  it('does not redirect when signUp returns failure', async () => {
    mockSignUp.mockResolvedValue({
      success: false,
      error: { message: 'Weak password' }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ---- Password validation edge cases ----

  it('rejects password with only letters (no digit)', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'abcdefgh');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'abcdefgh');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Min 8 characters, at least one letter and one number.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects password with only digits (no letter)', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), '12345678');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), '12345678');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Min 8 characters, at least one letter and one number.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 8 characters', () => {
    render(<CreateAccountScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Pass1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Pass1');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));
    expect(screen.getByText('Min 8 characters, at least one letter and one number.')).toBeTruthy();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  // ---- Story 6-11: Register button disabled until consent ----

  it('register button is disabled when consent is not given', () => {
    render(<CreateAccountScreen />);
    const button = screen.getByTestId('register-button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('register button is enabled after consent is given', () => {
    render(<CreateAccountScreen />);
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    const button = screen.getByTestId('register-button');
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });

  // ---- Story 6-11: Consent persisted on registration ----

  it('persists consent record after successful registration', async () => {
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSetConsentGiven).toHaveBeenCalledTimes(1);
    });
  });

  it('does not persist consent when registration fails', async () => {
    mockSignUp.mockResolvedValue({
      success: false,
      error: { message: 'User already registered' }
    });

    render(<CreateAccountScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSetConsentGiven).not.toHaveBeenCalled();
    });
  });
});
