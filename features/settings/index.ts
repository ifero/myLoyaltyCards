// Settings Feature Module — DO NOT import from other features
export const SETTINGS_FEATURE = 'settings';

export {
  isFirstLaunch,
  completeFirstLaunch,
  resetFirstLaunch,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding
} from './settings-repository';
