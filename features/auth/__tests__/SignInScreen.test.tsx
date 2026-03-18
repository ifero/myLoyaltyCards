/**
 * SignInScreen — Unit Tests
 * Story 6-7: Sign In with Email
 */

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import SignInScreen from '../SignInScreen';

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
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));

const mockSignInWithEmail = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  signInWithEmail: (...args: unknown[]) => mockSignInWithEmail(...args)
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fillForm = (emailValue = 'test@example.com', passwordValue = 'Password1') => {
  fireEvent.changeText(screen.getByTestId('email-input'), emailValue);
  fireEvent.changeText(screen.getByTestId('password-input'), passwordValue);
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- Rendering ----

  it('renders the screen container', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('sign-in-screen')).toBeTruthy();
  });

  it('renders the title', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('sign-in-title')).toBeTruthy();
    expect(screen.getByTestId('sign-in-title').props.children).toBe('Sign In');
  });

  it('renders email and password inputs', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
  });

  it('renders the sign-in button', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('sign-in-button')).toBeTruthy();
  });

  it('renders the create account link', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('create-account-link')).toBeTruthy();
  });

  it('has proper accessibility labels on inputs', () => {
    render(<SignInScreen />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  // ---- Validation ----

  it('shows email error when email is empty on submit', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
  });

  it('shows email error for invalid email format', () => {
    render(<SignInScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'not-an-email');
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('shows password error when password is empty', () => {
    render(<SignInScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(screen.getByText('Password is required.')).toBeTruthy();
  });

  it('clears email error on input change', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(screen.getByTestId('email-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('email-input'), 'a');
    expect(screen.queryByTestId('email-error')).toBeNull();
  });

  it('clears password error on input change', () => {
    render(<SignInScreen />);
    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(screen.getByTestId('password-error')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('password-input'), 'a');
    expect(screen.queryByTestId('password-error')).toBeNull();
  });

  it('does not call signInWithEmail when validation fails', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('sign-in-button'));
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  // ---- Successful sign-in ----

  it('calls signInWithEmail and redirects to home on success', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } }
    });

    render(<SignInScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'Password1');
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('trims whitespace from email before submitting', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } }
    });

    render(<SignInScreen />);
    fillForm('  test@example.com  ');
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'Password1');
    });
  });

  // ---- Error handling ----

  it('displays server error message on signInWithEmail failure', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: false,
      error: { message: 'Invalid login credentials' }
    });

    render(<SignInScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('Invalid login credentials')).toBeTruthy();
    });
  });

  it('displays generic error when signInWithEmail throws', async () => {
    mockSignInWithEmail.mockRejectedValue(new Error('Network failure'));

    render(<SignInScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('server-error')).toBeTruthy();
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeTruthy();
    });
  });

  it('does not redirect when signInWithEmail returns failure', async () => {
    mockSignInWithEmail.mockResolvedValue({
      success: false,
      error: { message: 'Wrong password' }
    });

    render(<SignInScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ---- Navigation ----

  it('navigates to create-account screen when create account link is pressed', () => {
    render(<SignInScreen />);
    fireEvent.press(screen.getByTestId('create-account-link'));
    expect(mockPush).toHaveBeenCalledWith('/create-account');
  });

  it('navigates to forgot-password screen when forgot password link is pressed', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('forgot-password-link')).toBeTruthy();
    fireEvent.press(screen.getByTestId('forgot-password-link'));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
  });

  // ---- Loading state ----

  it('shows loading indicator while submitting', async () => {
    let resolve: (v: unknown) => void;
    mockSignInWithEmail.mockImplementation(
      () =>
        new Promise((res) => {
          resolve = res;
        })
    );

    render(<SignInScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    });

    // Resolve to clean up
    resolve!({ success: true, data: { user: { id: 'u1' }, session: { access_token: 'tok' } } });
  });
});
