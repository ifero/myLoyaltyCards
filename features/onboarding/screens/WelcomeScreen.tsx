import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BrandedIcon } from '../components/BrandedIcon';
import { FannedCardIllustration } from '../components/FannedCardIllustration';

const WelcomeScreen = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  React.useEffect(() => {
    if (!isFirstLaunch()) {
      router.replace('/');
    }
  }, [router]);

  return (
    // Scrolls only when its content outgrows the screen — at the largest Dynamic Type sizes, where
    // it would otherwise push "Get Started" below the fold with no way to reach it (Story 21.6).
    // `alwaysBounceVertical={false}` keeps it still whenever everything fits.
    <ScrollView
      testID="welcome-screen"
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 64,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24
      }}
      alwaysBounceVertical={false}
      accessibilityLabel={t('onboarding.welcome.screenLabel')}
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
            ...TYPOGRAPHY.displayLg
          }}
        >
          {t('onboarding.welcome.title')}
        </Text>

        <Text
          testID="welcome-subtitle"
          style={{
            marginTop: 6,
            color: theme.textSecondary,
            textAlign: 'center',
            ...TYPOGRAPHY.bodyLg
          }}
        >
          {t('onboarding.welcome.subtitle')}
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
          {t('onboarding.welcome.getStarted')}
        </Button>

        <Pressable
          testID="welcome-sign-in"
          onPress={() => router.push('/sign-in')}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.welcome.existingAccountAccessibilityLabel')}
          accessibilityHint={t('onboarding.welcome.existingAccountHint')}
          style={{
            marginTop: 18,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text style={{ ...TYPOGRAPHY.bodyMdStrong, color: theme.link, textAlign: 'center' }}>
            {t('onboarding.welcome.existingAccount')}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default WelcomeScreen;
