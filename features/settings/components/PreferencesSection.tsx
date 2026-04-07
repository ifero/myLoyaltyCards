import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

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

  return (
    <SettingsSection title="Preferences">
      <ActionRow
        testID="settings-theme-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="brightness-6" size={24} color={theme.primary} />}
        label="Theme"
        value={themeLabel}
        onPress={onThemePress}
      />
      <ActionRow
        testID="settings-language-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="language" size={24} color={theme.primary} />}
        label="Language"
        value={languageName}
        onPress={onLanguagePress}
      />
    </SettingsSection>
  );
};
