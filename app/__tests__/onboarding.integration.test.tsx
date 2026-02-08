import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import React from 'react';

// Mock router for navigation assertions
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn()
  },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn()
  })
}));

// Mock getAllCards to return empty list
jest.mock('@/core/database', () => ({
  getAllCards: jest.fn()
}));

import { getAllCards } from '@/core/database';

import { router } from 'expo-router';

import HomeScreen from '../index';

// Mock expo-camera hook used by HomeScreen
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [{ granted: true }, jest.fn().mockResolvedValue({ granted: true })]
}));

describe('Home onboarding integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no onboarding flag is set
    const g = global as unknown as { __kvStoreData?: Record<string, string> };
    if (g.__kvStoreData) {
      delete g.__kvStoreData['onboarding_completed'];
    }
  });

  it('shows the onboarding overlay when there are zero cards and onboarding not completed', async () => {
    (getAllCards as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => expect(getByTestId('onboard-overlay')).toBeTruthy());
  });

  it('navigates to add-card when Add manually is tapped and marks onboarding completed', async () => {
    const pushSpy = router.push as jest.Mock;

    (getAllCards as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => expect(getByTestId('onboard-overlay')).toBeTruthy());

    fireEvent.press(getByTestId('onboard-add-manual'));

    await waitFor(() => expect(pushSpy).toHaveBeenCalledWith('/add-card'));

    // onboarding flag should be set
    expect(Storage.setItemSync).toHaveBeenCalledWith('onboarding_completed', 'true');
  });
});
