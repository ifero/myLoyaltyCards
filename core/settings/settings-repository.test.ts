jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    setItemSync: jest.fn(),
    removeItemSync: jest.fn()
  }
}));

import Storage from 'expo-sqlite/kv-store';

import {
  isFirstLaunch,
  completeFirstLaunch,
  resetFirstLaunch,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding
} from './settings-repository';

describe('settings-repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('isFirstLaunch returns true when never set or explicitly true', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
    expect(isFirstLaunch()).toBe(true);

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('true');
    expect(isFirstLaunch()).toBe(true);

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('false');
    expect(isFirstLaunch()).toBe(false);
  });

  test('completeFirstLaunch and resetFirstLaunch call storage', () => {
    completeFirstLaunch();
    expect(Storage.setItemSync).toHaveBeenCalledWith('first_launch', 'false');

    resetFirstLaunch();
    expect(Storage.removeItemSync).toHaveBeenCalledWith('first_launch');
  });

  test('onboarding flags behave correctly', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('true');
    expect(isOnboardingCompleted()).toBe(true);

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('false');
    expect(isOnboardingCompleted()).toBe(false);

    completeOnboarding();
    expect(Storage.setItemSync).toHaveBeenCalledWith('onboarding_completed', 'true');

    resetOnboarding();
    expect(Storage.removeItemSync).toHaveBeenCalledWith('onboarding_completed');
  });
});
