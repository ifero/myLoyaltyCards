import React from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

const LanguageListScreen = () => {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Text style={{ color: theme.textSecondary }}>
        Language selection moved to a bottom sheet.
      </Text>
    </View>
  );
};

export default LanguageListScreen;
