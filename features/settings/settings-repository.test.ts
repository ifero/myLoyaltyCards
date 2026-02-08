/**
 * Settings Repository Tests
 * Story 4.1: Welcome Screen
 *
 * Tests for first_launch persistence via expo-sqlite/kv-store.
 */

// Extend global type for the in-memory KV store mock (see jest.setup.js)
declare const global: typeof globalThis & {
  __kvStoreData: Record<string, string>;
};

import Storage from 'expo-sqlite/kv-store';

import {
  isFirstLaunch,
  completeFirstLaunch,
  resetFirstLaunch,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding
} from './settings-repository';

describe('Settings Repository — first_launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the in-memory KV store
    Object.keys(global.__kvStoreData).forEach((k) => delete global.__kvStoreData[k]);
  });

  describe('isFirstLaunch', () => {
    it('returns true when no value has been stored (fresh install)', () => {
      expect(isFirstLaunch()).toBe(true);
      expect(Storage.getItemSync).toHaveBeenCalledWith('first_launch');
    });

    it('returns true when stored value is "true"', () => {
      global.__kvStoreData['first_launch'] = 'true';
      expect(isFirstLaunch()).toBe(true);
    });

    it('returns false when stored value is "false"', () => {
      global.__kvStoreData['first_launch'] = 'false';
      expect(isFirstLaunch()).toBe(false);
    });
  });

  describe('completeFirstLaunch', () => {
    it('stores "false" for first_launch key', () => {
      completeFirstLaunch();
      expect(Storage.setItemSync).toHaveBeenCalledWith('first_launch', 'false');
      expect(global.__kvStoreData['first_launch']).toBe('false');
    });

    it('causes isFirstLaunch() to return false afterwards', () => {
      expect(isFirstLaunch()).toBe(true);
      completeFirstLaunch();
      expect(isFirstLaunch()).toBe(false);
    });
  });

  describe('resetFirstLaunch', () => {
    it('removes first_launch key from storage', () => {
      completeFirstLaunch();
      expect(isFirstLaunch()).toBe(false);

      resetFirstLaunch();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('first_launch');
      expect(isFirstLaunch()).toBe(true);
    });
  });

  describe('onboarding', () => {
    it('returns false when key is not set', () => {
      expect(isOnboardingCompleted()).toBe(false);
      expect(Storage.getItemSync).toHaveBeenCalledWith('onboarding_completed');
    });

    it('returns true when stored value is "true"', () => {
      global.__kvStoreData['onboarding_completed'] = 'true';
      expect(isOnboardingCompleted()).toBe(true);
    });

    it('completeOnboarding stores "true"', () => {
      completeOnboarding();
      expect(Storage.setItemSync).toHaveBeenCalledWith('onboarding_completed', 'true');
      expect(global.__kvStoreData['onboarding_completed']).toBe('true');
    });

    it('resetOnboarding removes the key', () => {
      completeOnboarding();
      expect(isOnboardingCompleted()).toBe(true);
      resetOnboarding();
      expect(Storage.removeItemSync).toHaveBeenCalledWith('onboarding_completed');
      expect(isOnboardingCompleted()).toBe(false);
    });
  });
});
