import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

import { SettingsSection } from './SettingsSection';

type PreferencesSectionProps = {
  themeLabel: string;
  languageName: string;
  onThemePress: () => void;
  onLanguagePress: () => void;
};

export const PreferencesSection = ({
  themeLabel,
  languageName,
  onThemePress,
  onLanguagePress
}: PreferencesSectionProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.sections.preferences')}>
      <ActionRow
        testID="settings-theme-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="brightness-6" size={24} color={theme.primary} />}
        label={t('settings.preferences.themeLabel')}
        value={themeLabel}
        onPress={onThemePress}
      />
      <ActionRow
        testID="settings-language-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="language" size={24} color={theme.primary} />}
        label={t('settings.preferences.languageLabel')}
        value={languageName}
        onPress={onLanguagePress}
      />
    </SettingsSection>
  );
};
