/**
 * Welcome Screen
 * Story 4.1: Welcome Screen
 *
 * First-launch screen that communicates the app's value proposition
 * and offers paths to onboarding or the card list.
 *
 * Design spec: docs/ux-designs/4-1-welcome-screen-design.md
 */

import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

import { completeFirstLaunch } from '@/features/settings';

/**
 * WelcomeScreen — shown once on first app launch.
 *
 * Layout: vertically-centered single-screen with illustration placeholder,
 * title, tagline, and two CTAs ("Get started" + "Skip").
 */
const WelcomeScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleGetStarted = () => {
    completeFirstLaunch();
    // Navigate to first-card guidance (Story 4.2)
    // For now, navigates to add-card as the guidance flow is not yet implemented
    router.replace('/add-card');
  };

  const handleSkip = () => {
    completeFirstLaunch();
    router.replace('/');
  };

  return (
    <View
      testID="welcome-screen"
      className="flex-1 items-center px-6 pb-12 pt-20"
      style={{ backgroundColor: theme.background }}
      accessibilityLabel="Welcome to myLoyaltyCards"
    >
      {/* Illustration placeholder */}
      <View
        testID="welcome-illustration"
        className="mb-8 h-40 w-52 items-center justify-center rounded-2xl"
        style={{ backgroundColor: theme.primary + '1A' }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text className="text-6xl">💳</Text>
      </View>

      {/* Title */}
      <Text
        testID="welcome-title"
        accessibilityRole="header"
        className="mb-2 text-center text-[28px] font-bold"
        style={{ color: theme.textPrimary }}
      >
        myLoyaltyCards
      </Text>

      {/* Tagline */}
      <Text className="text-center text-base leading-6" style={{ color: theme.textSecondary }}>
        Your loyalty cards, always ready.{'\n'}No phone needed.
      </Text>

      {/* Flex spacer pushes CTAs to bottom */}
      <View className="flex-1" />

      {/* Primary CTA */}
      <Pressable
        testID="welcome-get-started"
        onPress={handleGetStarted}
        accessibilityRole="button"
        accessibilityLabel="Get started"
        accessibilityHint="Opens first card setup"
        className="mb-4 w-full items-center justify-center rounded-xl"
        style={({ pressed }) => ({
          backgroundColor: pressed ? theme.primaryDark : theme.primary,
          height: 52,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        })}
      >
        <Text className="text-base font-semibold text-white">Get started</Text>
      </Pressable>

      {/* Secondary CTA */}
      <Pressable
        testID="welcome-skip"
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        accessibilityHint="Goes to your card list"
        className="h-11 items-center justify-center"
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1
        })}
      >
        <Text className="text-sm" style={{ color: theme.textSecondary }}>
          Skip
        </Text>
      </Pressable>
    </View>
  );
};

export default WelcomeScreen;
