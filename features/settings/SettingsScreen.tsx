import { useRouter } from 'expo-router';
import { Pressable, View, Text } from 'react-native';

import { catalogueRepository } from '@/core/catalogue/catalogue-repository';

import { useTheme } from '@/shared/theme';

/**
 * Settings Screen
 *
 * Story 1.5: Placeholder screen for app settings.
 * Will be implemented in future stories with language, theme, and account options.
 */
const SettingsScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
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

      <Pressable
        testID="settings-help-faq"
        onPress={() => router.push('/help')}
        accessibilityRole="button"
        accessibilityLabel="Help & FAQ"
        accessibilityHint="Opens help and frequently asked questions"
        className="mt-8 items-center"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          Help & FAQ
        </Text>
      </Pressable>
    </View>
  );
};

export default SettingsScreen;
