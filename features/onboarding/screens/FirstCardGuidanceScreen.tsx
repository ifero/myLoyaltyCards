import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isFirstLaunch } from '@/core/settings/settings-repository';

import { Button } from '@/shared/components/ui/Button';
import { useTheme } from '@/shared/theme';

import { BrandedIcon } from '../components/BrandedIcon';
import { useOnboardingFlow } from '../hooks/useOnboardingFlow';

const FirstCardGuidanceScreen = () => {
  const { theme, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completeAndGoToAddCard } = useOnboardingFlow();

  React.useEffect(() => {
    if (!isFirstLaunch()) {
      router.replace('/');
    }
  }, [router]);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.('Add your first card screen');
  }, []);

  return (
    <View
      testID="first-card-guidance-screen"
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View
        style={{
          paddingTop: insets.top,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingHorizontal: 12,
          minHeight: 56 + insets.top,
          flexDirection: 'row',
          alignItems: 'center'
        }}
      >
        <Pressable
          testID="first-card-guidance-header-add"
          accessibilityRole="button"
          accessibilityLabel="Add card"
          onPress={completeAndGoToAddCard}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </Pressable>

        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            color: theme.textPrimary,
            fontSize: 17,
            lineHeight: 22,
            fontWeight: '600'
          }}
        >
          My Loyalty Cards
        </Text>

        <Pressable
          testID="first-card-guidance-header-settings"
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <MaterialIcons name="settings" size={24} color={theme.primary} />
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 90,
          paddingBottom: Math.max(insets.bottom + 24, 24)
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <BrandedIcon testID="first-card-guidance-icon" size={120} icon="add" iconSize={42} />

          <Text
            accessibilityRole="header"
            style={{
              marginTop: 30,
              color: theme.textPrimary,
              textAlign: 'center',
              fontSize: typography.title2.fontSize,
              lineHeight: typography.title2.lineHeight,
              fontWeight: typography.title2.fontWeight
            }}
          >
            No cards yet
          </Text>

          <Text
            style={{
              marginTop: 10,
              textAlign: 'center',
              color: theme.textSecondary,
              fontSize: 15,
              lineHeight: 22,
              marginHorizontal: 12
            }}
          >
            Add your first loyalty card to get started.{`\n`}It only takes a few seconds!
          </Text>
        </View>

        <View style={{ marginTop: 34 }}>
          <Button
            variant="primary"
            size="large"
            onPress={completeAndGoToAddCard}
            testID="first-card-guidance-cta"
          >
            Add Your First Card
          </Button>

          <Pressable
            testID="first-card-guidance-secondary"
            accessibilityRole="button"
            accessibilityLabel="Browse the catalogue"
            onPress={() => router.push('/')}
            style={{ marginTop: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: theme.link, fontSize: 15, fontWeight: '500' }}>
              Browse the catalogue
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default FirstCardGuidanceScreen;
