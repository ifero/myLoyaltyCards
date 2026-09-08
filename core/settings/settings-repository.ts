/**
 * Settings Repository
 * Story 4.1: Welcome Screen
 *
 * Provides typed getters/setters for app settings
 * backed by expo-sqlite/kv-store (synchronous API).
 */

import Storage from 'expo-sqlite/kv-store';

/** Settings keys — centralised to avoid magic strings */
const KEYS = {
  FIRST_LAUNCH: 'first_launch',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME_PREFERENCE: 'theme_preference',
  LANGUAGE_PREFERENCE: 'language_preference',
  AUTO_BRIGHTNESS: 'auto_brightness'
} as const;

export type ThemePreference = 'light' | 'dark' | 'system';
export type LanguagePreference = 'en' | 'it' | 'system';

/**
 * Check whether this is the user's first launch.
 * Returns `true` when no value has been stored yet (fresh install)
 * or when the stored value is explicitly `'true'`.
 */
export const isFirstLaunch = (): boolean => {
  const value = Storage.getItemSync(KEYS.FIRST_LAUNCH);
  // null → never set → first launch
  return value === null || value === 'true';
};

/**
 * Mark the first-launch experience as completed.
 * Called after the user taps either "Get started" or "Skip".
 */
export const completeFirstLaunch = (): void => {
  Storage.setItemSync(KEYS.FIRST_LAUNCH, 'false');
};

/**
 * Reset first-launch flag (useful for testing / dev).
 */
export const resetFirstLaunch = (): void => {
  Storage.removeItemSync(KEYS.FIRST_LAUNCH);
};

/**
 * Check whether onboarding guidance has been completed
 */
export const isOnboardingCompleted = (): boolean => {
  const value = Storage.getItemSync(KEYS.ONBOARDING_COMPLETED);
  return value === 'true';
};

/**
 * Mark onboarding guidance as completed
 */
export const completeOnboarding = (): void => {
  Storage.setItemSync(KEYS.ONBOARDING_COMPLETED, 'true');
};

/**
 * Reset onboarding flag (useful for testing / dev).
 */
export const resetOnboarding = (): void => {
  Storage.removeItemSync(KEYS.ONBOARDING_COMPLETED);
};

/**
 * Get the persisted theme preference.
 * Defaults to system.
 */
export const getThemePreference = (): ThemePreference => {
  const value = Storage.getItemSync(KEYS.THEME_PREFERENCE);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
};

/**
 * Persist theme preference.
 */
export const setThemePreference = (value: ThemePreference): void => {
  Storage.setItemSync(KEYS.THEME_PREFERENCE, value);
};

/**
 * Get persisted language preference.
 * Defaults to system locale detection.
 */
export const getLanguagePreference = (): LanguagePreference => {
  const value = Storage.getItemSync(KEYS.LANGUAGE_PREFERENCE);

  if (value === 'en' || value === 'it' || value === 'system') {
    return value;
  }

  return 'system';
};

/**
 * Persist language preference.
 */
export const setLanguagePreference = (value: LanguagePreference): void => {
  Storage.setItemSync(KEYS.LANGUAGE_PREFERENCE, value);
};

/**
 * Whether the card detail screen should go to full brightness by itself.
 *
 * **Defaults to `false`** (Story 16.39, ifero 2026-09-07): only an explicit stored
 * `'true'` enables it. Anything else — never set, cleared, or a corrupted value —
 * reads as off, so a fresh install behaves exactly as it did before the setting
 * existed and nobody has their screen brightness changed without asking.
 *
 * Note this is the inverse of `isFirstLaunch`'s convention, where `null` means
 * "yes". Opting a user into a device-level side effect is not a safe default; being
 * treated as a first launch is.
 */
export const getAutoBrightnessEnabled = (): boolean => {
  return Storage.getItemSync(KEYS.AUTO_BRIGHTNESS) === 'true';
};

/**
 * Persist the auto-brightness preference.
 */
export const setAutoBrightnessEnabled = (value: boolean): void => {
  Storage.setItemSync(KEYS.AUTO_BRIGHTNESS, value ? 'true' : 'false');
};
