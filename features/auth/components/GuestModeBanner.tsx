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
  const spacingXs = spacing?.xs ?? 4;
  const spacingSm = spacing?.sm ?? 8;
  const spacingMd = spacing?.md ?? 16;
  const minTouchTarget = touchTarget?.min ?? 44;
  const subheadlineFontSize = typography?.subheadline?.fontSize ?? 16;
  const subheadlineLineHeight = typography?.subheadline?.lineHeight ?? 20;
  const footnoteFontSize = typography?.footnote?.fontSize ?? 13;
  const footnoteLineHeight = typography?.footnote?.lineHeight ?? 18;
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

      <View style={{ paddingHorizontal: spacingMd, paddingVertical: spacingMd }}>
        <Pressable
          testID="guest-mode-banner-dismiss-button"
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss banner"
          style={{
            position: 'absolute',
            top: spacingSm,
            right: spacingSm,
            minHeight: minTouchTarget,
            minWidth: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1
          }}
        >
          <MaterialIcons name="close" size={20} color={theme.primary} />
        </Pressable>

        <View className="flex-row" style={{ paddingRight: minTouchTarget - spacingXs }}>
          <View
            className="mr-3 mt-0.5 h-4.5 w-4.5 items-center justify-center rounded-full"
            style={{ backgroundColor: `${theme.primary}1A` }}
          >
            <MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.primary} />
          </View>

          <View className="flex-1">
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: subheadlineFontSize,
                lineHeight: subheadlineLineHeight,
                fontWeight: '600'
              }}
            >
              Protect your cards
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                marginTop: spacingXs,
                fontSize: footnoteFontSize,
                lineHeight: footnoteLineHeight
              }}
            >
              Create a free account to back up your cards and access them on all your devices
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row items-center" style={{ gap: spacingSm }}>
          <View>
            <Button
              testID="guest-mode-banner-create-account"
              variant="primary"
              onPress={() => router.push('/create-account')}
              accessibilityLabel="Create account"
            >
              Create Account
            </Button>
          </View>
          <View>
            <Button
              testID="guest-mode-banner-sign-in"
              variant="secondary"
              onPress={() => router.push('/sign-in')}
              accessibilityLabel="Sign in"
            >
              Sign In
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
};
