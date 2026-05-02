import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import CreateAccountScreen from '../CreateAccountScreen';

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
const mockPush = jest.fn();
const mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => mockParams
}));

const mockSignUp = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args)
}));

const mockSetConsentGiven = jest.fn();
jest.mock('@/core/privacy/consent-repository', () => ({
  setConsentGiven: () => mockSetConsentGiven()
}));

describe('CreateAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockParams).forEach((key) => delete mockParams[key]);
  });

  it('renders app icon header and auth fields', () => {
    render(<CreateAccountScreen />);

    expect(screen.getByTestId('auth-app-icon')).toBeTruthy();
    expect(screen.getByTestId('create-account-title')).toBeTruthy();
    expect(screen.getByTestId('email-input')).toBeTruthy();
    expect(screen.getByTestId('password-input')).toBeTruthy();
    expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
  });

  it('updates password toggle accessibility label', () => {
    render(<CreateAccountScreen />);

    const toggle = screen.getByTestId('password-input-toggle');
    expect(screen.getAllByLabelText('Show password').length).toBeGreaterThan(0);

    fireEvent.press(toggle);
    expect(screen.getByLabelText('Hide password')).toBeTruthy();
  });

  it('updates password strength indicator label', () => {
    render(<CreateAccountScreen />);

    fireEvent.changeText(screen.getByTestId('password-input'), 'abc');
    expect(screen.getByTestId('password-strength-indicator-label').props.children).toBe('Weak');

    fireEvent.changeText(screen.getByTestId('password-input'), 'Password123!@#');
    expect(screen.getByTestId('password-strength-indicator-label').props.children).toBe('Strong');
  });

  it('shows inline validation on invalid email blur', () => {
    render(<CreateAccountScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'invalid-email');
    fireEvent(screen.getByTestId('email-input'), 'blur');

    expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
  });

  it('navigates to sign-in screen from auth link', () => {
    render(<CreateAccountScreen />);

    fireEvent.press(screen.getByTestId('sign-in-link'));
    expect(mockPush).toHaveBeenCalledWith('/sign-in');
  });

  it('submits and redirects on successful registration', async () => {
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: { access_token: 'token' } }
    });

    render(<CreateAccountScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password1');
      expect(mockSetConsentGiven).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('prefills the email field from route params', () => {
    mockParams.email = 'saved@example.com';

    render(<CreateAccountScreen />);

    expect(screen.getByTestId('email-input').props.value).toBe('saved@example.com');
  });

  it('navigates to verify-email when registration succeeds without a session', async () => {
    mockSignUp.mockResolvedValue({
      success: true,
      data: { user: { id: 'u1' }, session: null }
    });

    render(<CreateAccountScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(screen.getByTestId('password-input'), 'Password1');
    fireEvent.changeText(screen.getByTestId('confirm-password-input'), 'Password1');
    fireEvent.press(screen.getByTestId('consent-checkbox-toggle'));
    fireEvent.press(screen.getByTestId('register-button'));

    await waitFor(() => {
      expect(mockSetConsentGiven).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/verify-email',
        params: expect.objectContaining({
          email: 'test@example.com'
        })
      });
    });
  });
});
