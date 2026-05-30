import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';

import { useTheme } from '@/shared/theme';

import type { ThemePreference } from '../types';

export const useThemePreference = () => {
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);

  const themePreferenceLabels: Record<ThemePreference, string> = {
    light: t('common.theme.light'),
    dark: t('common.theme.dark'),
    system: t('common.theme.system')
  };

  const openThemePicker = () => setIsThemePickerOpen(true);
  const closeThemePicker = () => setIsThemePickerOpen(false);

  const selectTheme = (value: ThemePreference) => {
    setThemePreference(value);
    AccessibilityInfo.announceForAccessibility?.(
      t('settings.theme.selectedAnnouncement', { theme: themePreferenceLabels[value] })
    );
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
