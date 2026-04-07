import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

const GUEST_BANNER_DISMISSED_KEY = 'guest_banner_dismissed';

type GuestModeBannerProps = {
  isGuestMode: boolean;
};

export const GuestModeBanner = ({ isGuestMode }: GuestModeBannerProps) => {
  const { theme, typography, spacing, touchTarget, isDark } = useTheme();
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDismissedState = async () => {
      try {
        const value = await AsyncStorage.getItem(GUEST_BANNER_DISMISSED_KEY);
        if (mounted) {
          setIsDismissed(value === '1');
        }
      } catch {
        if (mounted) {
          setIsDismissed(false);
        }
      }
    };

    loadDismissedState();

    return () => {
      mounted = false;
    };
  }, []);

  const dismiss = async () => {
    setIsDismissed(true);
    try {
      await AsyncStorage.setItem(GUEST_BANNER_DISMISSED_KEY, '1');
    } catch {
      // No-op: UI remains dismissed for current session.
    }
  };

  if (!isGuestMode || isDismissed !== false) {
    return null;
  }

  return (
    <View
      testID="guest-mode-banner"
      className="mx-4 mb-3 mt-2 overflow-hidden rounded-2xl"
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: `${theme.primary}33`
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: `${theme.primary}${isDark ? '1F' : '14'}`
        }}
      />

      <View style={{ padding: spacing.md }}>
        <Pressable
          testID="guest-mode-banner-dismiss-button"
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss banner"
          style={{
            alignSelf: 'flex-end',
            minHeight: touchTarget.min,
            minWidth: touchTarget.min,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialIcons name="close" size={20} color={theme.textSecondary} />
        </Pressable>

        <View className="flex-row">
          <View
            className="mr-3 mt-0.5 h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${theme.primary}1A` }}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={22} color={theme.primary} />
          </View>

          <View className="flex-1">
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: typography.headline.fontSize,
                lineHeight: typography.headline.lineHeight,
                fontWeight: typography.headline.fontWeight
              }}
            >
              Protect your cards
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                marginTop: spacing.xs,
                fontSize: typography.footnote.fontSize,
                lineHeight: typography.footnote.lineHeight
              }}
            >
              Create a free account to back up your cards and access them on all your devices
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing.md }}>
          <Button
            testID="guest-mode-banner-create-account"
            variant="primary"
            size="large"
            onPress={() => router.push('/create-account')}
            accessibilityLabel="Create account"
          >
            Create Account
          </Button>
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            testID="guest-mode-banner-sign-in"
            onPress={() => router.push('/sign-in')}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            style={{ minHeight: touchTarget.min, justifyContent: 'center' }}
          >
            <Text style={{ color: theme.link, fontWeight: '600' }}>Sign In</Text>
          </Pressable>

          <Pressable
            testID="guest-mode-banner-not-now"
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            style={{ minHeight: touchTarget.min, justifyContent: 'center' }}
          >
            <Text style={{ color: theme.textSecondary }}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
