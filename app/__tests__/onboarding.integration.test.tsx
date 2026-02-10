import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import React from 'react';
import { Linking } from 'react-native';

// Use global `expo-router` mock from jest.setup.js for stable spies

// Mock getAllCards to return empty list
jest.mock('@/core/database', () => ({
  getAllCards: jest.fn()
}));

// Mock useCards hook to avoid async state updates during render
jest.mock('@/features/cards/hooks/useCards', () => ({
  useCards: () => ({
    cards: [],
    isLoading: false,
    error: null,
    refetch: jest.fn()
  })
}));

import { getAllCards } from '@/core/database';

import HomeScreen from '../index';

// Mock ThemeProvider used by components rendered in HomeScreen
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

const mockUseCameraPermissions = jest.fn();

// Mock expo-camera hook used by HomeScreen — default granted, tests can override
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => mockUseCameraPermissions()
}));

describe('Home onboarding integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no onboarding flag is set
    const g = global as unknown as { __kvStoreData?: Record<string, string> };
    if (g.__kvStoreData) {
      delete g.__kvStoreData['onboarding_completed'];
    }

    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      jest.fn().mockResolvedValue({ granted: true })
    ]);
  });

  it('shows the onboarding overlay when there are zero cards and onboarding not completed', async () => {
    (getAllCards as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => expect(getByTestId('onboard-overlay')).toBeTruthy());
  });

  it('navigates to add-card when Add manually is tapped and marks onboarding completed', async () => {
    const pushSpy = useRouter().push as jest.Mock;

    (getAllCards as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => expect(getByTestId('onboard-overlay')).toBeTruthy());

    fireEvent.press(getByTestId('onboard-add-manual'));

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/add-card'));

    // onboarding flag should be set
    expect(Storage.setItemSync).toHaveBeenCalledWith('onboarding_completed', 'true');
  });

  it('shows permission denied state when Scan is tapped and permission is denied, opens Settings and back returns to intro', async () => {
    // Mock camera permission to be denied for this test
    mockUseCameraPermissions.mockReturnValue([
      { granted: false },
      jest.fn().mockResolvedValue({ granted: false })
    ]);

    (getAllCards as jest.Mock).mockResolvedValue([]);

    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockImplementation(jest.fn());

    const { getByTestId, getByText } = render(<HomeScreen />);

    await waitFor(() => expect(getByTestId('onboard-overlay')).toBeTruthy());

    fireEvent.press(getByTestId('onboard-scan'));

    await waitFor(() => expect(getByText('Camera access required')).toBeTruthy());

    fireEvent.press(getByTestId('onboard-open-settings'));

    expect(openSettingsSpy).toHaveBeenCalled();

    // Back to intro
    fireEvent.press(getByTestId('onboard-permission-back'));
    await waitFor(() => expect(getByTestId('onboard-scan')).toBeTruthy());

    openSettingsSpy.mockRestore();
  });
});
