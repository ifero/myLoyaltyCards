import React from 'react';
import { View } from 'react-native';

import { SectionHeader } from '@/shared/components/ui/SectionHeader';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

// The 8pt gap is the design system's "sitting 8px above its rows" (Story 22.1).
export const SettingsSection = ({ title, children }: SettingsSectionProps) => (
  <View style={{ gap: 8 }}>
    <SectionHeader title={title} />
    {children}
  </View>
);
