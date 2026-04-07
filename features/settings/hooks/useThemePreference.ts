import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useTheme } from '@/shared/theme';

import type { ThemePreference } from '../types';

export const themePreferenceLabels: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
};

export const useThemePreference = () => {
  const { themePreference, setThemePreference } = useTheme();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const openThemePicker = () => setIsThemePickerOpen(true);
  const closeThemePicker = () => setIsThemePickerOpen(false);

  const selectTheme = (value: ThemePreference) => {
    setThemePreference(value);
    AccessibilityInfo.announceForAccessibility?.(`${themePreferenceLabels[value]} theme selected`);
    closeThemePicker();
  };

  return {
    themePreference,
    themePreferenceLabel: themePreferenceLabels[themePreference],
    isThemePickerOpen,
    openThemePicker,
    closeThemePicker,
    selectTheme
  };
};
