/**
 * Settings Screen Tests
 * Story 4.3: Help & FAQ Access
 */

import { render, fireEvent } from '@testing-library/react-native';

import SettingsScreen from '../settings';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

jest.mock('@/shared/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#FAFAFA',
      surface: '#FFFFFF',
      textPrimary: '#1F2937',
      textSecondary: '#6B7280',
      primary: '#73A973',
      border: '#E5E7EB'
    },
    isDark: false
  })
}));

jest.mock('@/core/catalogue/catalogue-repository', () => ({
  catalogueRepository: {
    getVersion: () => '2026-02-01'
  }
}));

describe('SettingsScreen — Story 4.3', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to Help & FAQ from Settings', () => {
    const { getByTestId } = render(<SettingsScreen />);

    fireEvent.press(getByTestId('settings-help-faq'));

    expect(mockPush).toHaveBeenCalledWith('/help');
  });
});
