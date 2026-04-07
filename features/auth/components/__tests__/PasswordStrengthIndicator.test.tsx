import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      border: '#E5E5EB',
      error: '#FF3B30',
      warning: '#D97706',
      success: '#16A34A'
    },
    typography: {
      caption1: { fontSize: 12, lineHeight: 16 }
    },
    spacing: { sm: 8, md: 16 }
  })
}));

describe('PasswordStrengthIndicator', () => {
  it('shows Weak for short/simple password', () => {
    render(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByTestId('password-strength-indicator-label').props.children).toBe('Weak');
  });

  it('shows Fair for medium complexity password', () => {
    render(<PasswordStrengthIndicator password="Password12" />);
    expect(screen.getByTestId('password-strength-indicator-label').props.children).toBe('Fair');
  });

  it('shows Strong for high complexity password', () => {
    render(<PasswordStrengthIndicator password="Password123!@#" />);
    expect(screen.getByTestId('password-strength-indicator-label').props.children).toBe('Strong');
  });

  it('changes bar color by strength level', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="abc" />);
    const weakColor = screen.getByTestId('password-strength-indicator-bar').props.style
      .backgroundColor;

    rerender(<PasswordStrengthIndicator password="Password123!@#" />);
    const strongColor = screen.getByTestId('password-strength-indicator-bar').props.style
      .backgroundColor;

    expect(weakColor).not.toBe(strongColor);
  });
});
