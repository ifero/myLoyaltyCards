// Settings Feature Module — DO NOT import from other features
export const SETTINGS_FEATURE = 'settings';

export { default as SettingsScreen } from './screens/SettingsScreen';
export { default as LanguageListScreen } from './screens/LanguageListScreen';

export { useThemePreference } from './hooks/useThemePreference';
export { useLanguagePreference } from './hooks/useLanguagePreference';
export { useExportData } from './hooks/useExportData';
export { useSyncTrigger } from './hooks/useSyncTrigger';

export {
  isFirstLaunch,
  completeFirstLaunch,
  resetFirstLaunch,
  isOnboardingCompleted,
  completeOnboarding,
  resetOnboarding,
  getThemePreference,
  setThemePreference,
  getLanguagePreference,
  setLanguagePreference
} from './settings-repository';
