import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';

import { BrandedIcon } from '../components/BrandedIcon';
import { FannedCardIllustration } from '../components/FannedCardIllustration';

const WelcomeScreen = () => {
  const { theme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  React.useEffect(() => {
    if (!isFirstLaunch()) {
      router.replace('/');
    }
  }, [router]);

  return (
    <View
      testID="welcome-screen"
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: insets.top + 64,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24
      }}
      accessibilityLabel="Welcome to myLoyaltyCards"
    >
      <View style={{ alignItems: 'center' }}>
        <BrandedIcon testID="welcome-branded-icon" size={100} iconSize={34} />

        <Text
          testID="welcome-title"
          accessibilityRole="header"
          style={{
            marginTop: 38,
            color: theme.textPrimary,
            textAlign: 'center',
            fontSize: typography.title1.fontSize,
            lineHeight: typography.title1.lineHeight,
            fontWeight: typography.title1.fontWeight
          }}
        >
          My Loyalty Cards
        </Text>

        <Text
          testID="welcome-subtitle"
          style={{
            marginTop: 6,
            color: theme.textSecondary,
            textAlign: 'center',
            fontSize: 17,
            lineHeight: 22
          }}
        >
          Your loyalty cards, always with you
        </Text>

        <View style={{ marginTop: 44 }}>
          <FannedCardIllustration testID="welcome-fanned-illustration" />
        </View>
      </View>

      <View style={{ marginTop: 74 }}>
        <Button
          variant="primary"
          size="large"
          onPress={() => router.push('/onboarding/mode-selection')}
          testID="welcome-get-started"
        >
          Get Started
        </Button>

        <Pressable
          testID="welcome-sign-in"
          onPress={() => router.push('/sign-in')}
          accessibilityRole="button"
          accessibilityLabel="I already have an account. Sign In"
          accessibilityHint="Navigates to the sign in screen"
          style={{
            marginTop: 18,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: theme.link, fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default WelcomeScreen;
