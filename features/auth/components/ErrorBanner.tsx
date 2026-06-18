import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

type ErrorBannerProps = {
  message: string | null;
  testID?: string;
};

export const ErrorBanner = ({ message, testID = 'auth-error-banner' }: ErrorBannerProps) => {
  const { theme, typography, spacing } = useTheme();

  if (!message) {
    return null;
  }

  return (
    <View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          backgroundColor: `${theme.error}14`,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md
        }
      ]}
    >
      <MaterialIcons name="error-outline" size={18} color={theme.error} />
      <Text
        style={{
          color: theme.error,
          marginLeft: spacing.sm,
          flex: 1,
          fontSize: typography.footnote.fontSize,
          lineHeight: typography.footnote.lineHeight
        }}
      >
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12
  }
});
