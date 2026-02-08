import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

import { catalogueRepository } from '@/features/cards/repositories/catalogue-repository';

/**
 * Settings Screen
 *
 * Story 1.5: Placeholder screen for app settings.
 * Will be implemented in future stories with language, theme, and account options.
 */
const SettingsScreen = () => {
  const { theme } = useTheme();
  const catalogueVersion = catalogueRepository.getVersion();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      <Text className="mb-2 text-2xl font-bold" style={{ color: theme.textPrimary }}>
        Settings
      </Text>
      <Text className="text-center text-base" style={{ color: theme.textSecondary }}>
        App settings coming soon!
      </Text>
      <View className="mt-6 items-center">
        <Text className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
          Catalogue Version
        </Text>
        <Text className="text-sm" style={{ color: theme.textSecondary }}>
          {catalogueVersion}
        </Text>
      </View>
    </View>
  );
};

export default SettingsScreen;
