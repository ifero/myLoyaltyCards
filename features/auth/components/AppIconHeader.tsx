import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';

export const AppIconHeader = () => {
  const { theme } = useTheme();

  return (
    <View
      testID="auth-app-icon-circle"
      className="mb-6 h-20 w-20 items-center justify-center self-center rounded-full"
      style={{ backgroundColor: `${theme.primary}1A` }}
    >
      <MaterialCommunityIcons
        testID="auth-app-icon"
        name="card-account-details-outline"
        size={36}
        color={theme.primary}
      />
    </View>
  );
};
