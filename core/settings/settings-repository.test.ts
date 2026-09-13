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
  resetOnboarding,
  getThemePreference,
  setThemePreference,
  getLanguagePreference,
  setLanguagePreference,
  getAutoBrightnessEnabled,
  setAutoBrightnessEnabled
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

  test('theme preference defaults to system and supports persistence', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
    expect(getThemePreference()).toBe('system');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('light');
    expect(getThemePreference()).toBe('light');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('dark');
    expect(getThemePreference()).toBe('dark');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('system');
    expect(getThemePreference()).toBe('system');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('unexpected');
    expect(getThemePreference()).toBe('system');

    setThemePreference('dark');
    expect(Storage.setItemSync).toHaveBeenCalledWith('theme_preference', 'dark');
  });

  test('language preference defaults to system and supports persistence', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValueOnce(null);
    expect(getLanguagePreference()).toBe('system');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('en');
    expect(getLanguagePreference()).toBe('en');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('it');
    expect(getLanguagePreference()).toBe('it');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('system');
    expect(getLanguagePreference()).toBe('system');

    (Storage.getItemSync as jest.Mock).mockReturnValueOnce('unexpected');
    expect(getLanguagePreference()).toBe('system');

    setLanguagePreference('it');
    expect(Storage.setItemSync).toHaveBeenCalledWith('language_preference', 'it');
  });
});

describe('auto-brightness preference (Story 16.39)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defaults to OFF when never set', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValue(null);

    // The load-bearing default. Brightness is a device-level side effect, so a fresh
    // install must behave exactly as it did before this setting existed. Note this is
    // the INVERSE of `isFirstLaunch`'s convention, where an unset value means "yes" —
    // being treated as a first launch is safe, silently brightening someone's phone is
    // not.
    expect(getAutoBrightnessEnabled()).toBe(false);
  });

  it('is on only for an explicit stored "true"', () => {
    (Storage.getItemSync as jest.Mock).mockReturnValue('true');
    expect(getAutoBrightnessEnabled()).toBe(true);
  });

  it.each([['false'], [''], ['TRUE'], ['1'], ['yes'], ['null']])(
    'reads %p as off rather than guessing',
    (stored) => {
      // A corrupted or hand-edited value must fail safe. `'TRUE'` and `'1'` are here
      // deliberately: both are things a human or another writer might plausibly store,
      // and neither should switch on a device-level side effect.
      (Storage.getItemSync as jest.Mock).mockReturnValue(stored);
      expect(getAutoBrightnessEnabled()).toBe(false);
    }
  );

  it('persists both states explicitly, never by absence', () => {
    setAutoBrightnessEnabled(true);
    expect(Storage.setItemSync).toHaveBeenLastCalledWith('auto_brightness', 'true');

    setAutoBrightnessEnabled(false);
    // Written as 'false' rather than removed: a stored 'false' and an absent key read
    // the same today, but only one of them records that the user made a choice.
    expect(Storage.setItemSync).toHaveBeenLastCalledWith('auto_brightness', 'false');
  });
});
