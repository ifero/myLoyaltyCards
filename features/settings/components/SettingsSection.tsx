import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

export const SettingsSection = ({ title, children }: SettingsSectionProps) => {
  const { theme } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text
        accessibilityRole="header"
        style={{
          ...TYPOGRAPHY.overline,
          color: theme.textTertiary,
          textTransform: 'uppercase'
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};
