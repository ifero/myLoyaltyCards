import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { PasswordInput } from '../PasswordInput';

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
      error: '#FF3B30'
    },
    touchTarget: { min: 44 }
  })
}));

describe('PasswordInput', () => {
  it('renders hidden password by default', () => {
    render(
      <PasswordInput
        testID="password-input"
        label="Password"
        value="Password1"
        onChangeText={jest.fn()}
        placeholder="Your password"
      />
    );

    expect(screen.getByLabelText('Show password')).toBeTruthy();
  });

  it('toggles password visibility and accessibility label', () => {
    render(
      <PasswordInput
        testID="password-input"
        label="Password"
        value="Password1"
        onChangeText={jest.fn()}
        placeholder="Your password"
      />
    );

    fireEvent.press(screen.getByTestId('password-input-toggle'));
    expect(screen.getByLabelText('Hide password')).toBeTruthy();

    fireEvent.press(screen.getByTestId('password-input-toggle'));
    expect(screen.getByLabelText('Show password')).toBeTruthy();
  });
});
