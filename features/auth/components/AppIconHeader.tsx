import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

export const AppIconHeader = () => {
  const { theme } = useTheme();

  return (
    <View
      testID="auth-app-icon-circle"
      style={[styles.circle, { backgroundColor: `${theme.primary}1A` }]}
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

const styles = StyleSheet.create({
  circle: {
    marginBottom: 48,
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 9999
  }
});
