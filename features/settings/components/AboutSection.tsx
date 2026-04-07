import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';

import { ActionRow } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

import { SettingsSection } from './SettingsSection';

type AboutSectionProps = {
  appVersion: string;
  catalogueVersion: string;
  onHelpPress: () => void;
  onPrivacyPress: () => void;
};

export const AboutSection = ({
  appVersion,
  catalogueVersion,
  onHelpPress,
  onPrivacyPress
}: AboutSectionProps) => {
  const { theme } = useTheme();

  return (
    <SettingsSection title="About">
      <ActionRow
        testID="settings-app-version-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="info-outline" size={24} color={theme.primary} />}
        label="App Version"
        value={appVersion}
        disabled
        showChevron={false}
        onPress={() => undefined}
      />
      <ActionRow
        testID="settings-catalogue-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="menu-book" size={24} color={theme.primary} />}
        label="Catalogue"
        value={catalogueVersion}
        disabled
        showChevron={false}
        onPress={() => undefined}
      />
      <ActionRow
        testID="settings-help-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="help-outline" size={24} color={theme.primary} />}
        label="Help & FAQ"
        onPress={onHelpPress}
      />
      <ActionRow
        testID="settings-privacy-row"
        variant="plain"
        noPaddingHorizontal
        prefix={<MaterialIcons name="policy" size={24} color={theme.primary} />}
        label="Privacy Policy"
        onPress={onPrivacyPress}
      />
    </SettingsSection>
  );
};
