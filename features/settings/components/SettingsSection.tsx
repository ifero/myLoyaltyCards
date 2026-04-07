import React from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

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
          color: theme.textTertiary,
          fontWeight: '600',
          fontSize: 12,
          letterSpacing: 0.5,
          textTransform: 'uppercase'
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};
