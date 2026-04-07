import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ThemeProvider, useTheme } from './ThemeProvider';

const mockUseColorScheme = jest.fn();
const mockGetThemePreference = jest.fn();
const mockSetThemePreference = jest.fn();

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockUseColorScheme()
}));

jest.mock('@/core/settings/settings-repository', () => ({
  getThemePreference: () => mockGetThemePreference(),
  setThemePreference: (value: 'light' | 'dark' | 'system') => mockSetThemePreference(value)
}));

const Probe = () => {
  const { colorScheme, themePreference, setThemePreference } = useTheme();

  return (
    <>
      <Text testID="color-scheme">{colorScheme}</Text>
      <Text testID="theme-preference">{themePreference}</Text>
      <Text testID="theme-primary">{useTheme().theme.primary}</Text>
      <Text testID="set-dark" onPress={() => setThemePreference('dark')}>
        set-dark
      </Text>
      <Text testID="set-system" onPress={() => setThemePreference('system')}>
        set-system
      </Text>
    </>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
    mockGetThemePreference.mockReturnValue('system');
  });

  it('uses system preference when theme preference is system', () => {
    mockUseColorScheme.mockReturnValue('dark');
    mockGetThemePreference.mockReturnValue('system');

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(getByTestId('theme-preference').props.children).toBe('system');
    expect(getByTestId('color-scheme').props.children).toBe('dark');
  });

  it('overrides system when stored preference is light', () => {
    mockUseColorScheme.mockReturnValue('dark');
    mockGetThemePreference.mockReturnValue('light');

    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    expect(getByTestId('theme-preference').props.children).toBe('light');
    expect(getByTestId('color-scheme').props.children).toBe('light');
  });

  it('persists updates when changing preference', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );

    fireEvent.press(getByTestId('set-dark'));
    expect(mockSetThemePreference).toHaveBeenCalledWith('dark');

    fireEvent.press(getByTestId('set-system'));
    expect(mockSetThemePreference).toHaveBeenCalledWith('system');
  });
});
