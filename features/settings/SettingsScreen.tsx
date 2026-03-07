import { useRouter } from 'expo-router';
import { Pressable, View, Text, ScrollView } from 'react-native';

import { catalogueRepository } from '@/core/catalogue/catalogue-repository';

import { useTheme } from '@/shared/theme';

/**
 * Settings Screen
 *
 * Story 1.5: Placeholder screen for app settings.
 * Story 6.5: Guest mode — shows guest mode badge and upgrade path to account creation.
 */
const SettingsScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const catalogueVersion = catalogueRepository.getVersion();

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, padding: 16, backgroundColor: theme.background }}
      style={{ backgroundColor: theme.background }}
    >
      {/* Guest mode badge */}
      <View
        testID="settings-guest-badge"
        className="mb-6 w-full rounded-xl p-4"
        style={{ backgroundColor: theme.surface }}
      >
        <View className="mb-2 flex-row items-center">
          <Text className="mr-2 text-base">👤</Text>
          <Text className="text-base font-semibold" style={{ color: theme.textPrimary }}>
            Guest Mode
          </Text>
        </View>
        <Text className="text-sm leading-5" style={{ color: theme.textSecondary }}>
          {"You're using the app as a guest. Your cards are stored only on this device."}
        </Text>
      </View>

      {/* Create Account section */}
      <View
        testID="settings-create-account-section"
        className="mb-6 w-full rounded-xl p-4"
        style={{ backgroundColor: theme.surface }}
      >
        <Text className="mb-2 text-base font-semibold" style={{ color: theme.textPrimary }}>
          Create an Account
        </Text>
        <Text className="mb-4 text-sm leading-5" style={{ color: theme.textSecondary }}>
          Upgrade to back up and sync your cards across devices. Your existing cards will be
          preserved.
        </Text>
        <Pressable
          testID="settings-create-account-button"
          onPress={() => router.push('/create-account')}
          accessibilityRole="button"
          accessibilityLabel="Create Account"
          accessibilityHint="Create an account to back up and sync your cards"
          className="w-full items-center justify-center rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.primaryDark : theme.primary,
            height: 48,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}
        >
          <Text className="text-sm font-semibold text-white">Create Account</Text>
        </Pressable>
      </View>

      {/* Catalogue version */}
      <View className="mb-6 items-center">
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
        className="mb-4 items-center"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          {'Help & FAQ'}
        </Text>
      </Pressable>

      <Pressable
        testID="settings-privacy-policy"
        onPress={() => router.push('/privacy-policy')}
        accessibilityRole="button"
        accessibilityLabel="Privacy Policy"
        accessibilityHint="Opens the privacy policy"
        className="items-center"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
          Privacy Policy
        </Text>
      </Pressable>
    </ScrollView>
  );
};

export default SettingsScreen;
