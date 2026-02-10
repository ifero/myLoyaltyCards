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
  ONBOARDING_COMPLETED: 'onboarding_completed'
} as const;

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
