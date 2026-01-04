import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

/**
 * Settings Screen
 *
 * Story 1.5: Placeholder screen for app settings.
 * Will be implemented in future stories with language, theme, and account options.
 */
const SettingsScreen = () => {
  const { theme } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      <Text
        className="text-2xl font-bold mb-2"
        style={{ color: theme.textPrimary }}
      >
        Settings
      </Text>
      <Text className="text-base text-center" style={{ color: theme.textSecondary }}>
        App settings coming soon!
      </Text>
    </View>
  );
};

export default SettingsScreen;
