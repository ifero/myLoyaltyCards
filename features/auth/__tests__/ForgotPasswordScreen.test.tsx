import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import ForgotPasswordScreen from '../ForgotPasswordScreen';

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

const mockRequestPasswordReset = jest.fn();
jest.mock('@/shared/supabase/auth', () => ({
  requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args)
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders reset heading, instruction and controls', () => {
    render(<ForgotPasswordScreen />);

    expect(screen.getByTestId('forgot-password-title')).toBeTruthy();
    expect(screen.getByText('Reset Password')).toBeTruthy();
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

  it('submits reset and shows confirmation state', async () => {
    mockRequestPasswordReset.mockResolvedValue({ success: true, data: undefined });

    render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId('email-input'), 'test@example.com');
    fireEvent.press(screen.getByTestId('send-reset-button'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(screen.getByTestId('forgot-password-confirmation')).toBeTruthy();
      expect(screen.getByTestId('reset-password-confirmation-icon')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('try-again-button'));

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('forgot-password-confirmation')).toBeTruthy();
    });
  });
});
