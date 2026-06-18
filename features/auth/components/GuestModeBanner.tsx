import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

const GUEST_BANNER_DISMISSED_KEY = 'guest_banner_dismissed';

type GuestModeBannerProps = {
  isGuestMode: boolean;
};

export const GuestModeBanner = ({ isGuestMode }: GuestModeBannerProps) => {
  const { theme, typography, spacing, touchTarget, isDark } = useTheme();
  const { t } = useTranslation();
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
      style={[
        styles.banner,
        {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: `${theme.primary}33`
        }
      ]}
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
          accessibilityLabel={t('auth.guestBanner.dismissA11y')}
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

        <View style={[styles.body, { paddingRight: minTouchTarget - spacingXs }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}1A` }]}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.primary} />
          </View>

          <View style={styles.bodyText}>
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: subheadlineFontSize,
                lineHeight: subheadlineLineHeight,
                fontWeight: '600'
              }}
            >
              {t('auth.guestBanner.title')}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                marginTop: spacingXs,
                fontSize: footnoteFontSize,
                lineHeight: footnoteLineHeight
              }}
            >
              {t('auth.guestBanner.body')}
            </Text>
          </View>
        </View>

        <View style={[styles.actions, { gap: spacingSm }]}>
          <View>
            <Button
              testID="guest-mode-banner-create-account"
              variant="primary"
              onPress={() => router.push('/create-account')}
              accessibilityLabel={t('common.actions.createAccount')}
            >
              {t('common.actions.createAccount')}
            </Button>
          </View>
          <View>
            <Button
              testID="guest-mode-banner-sign-in"
              variant="secondary"
              onPress={() => router.push('/sign-in')}
              accessibilityLabel={t('common.actions.signIn')}
            >
              {t('common.actions.signIn')}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 32,
    marginBottom: 24,
    marginTop: 16,
    overflow: 'hidden',
    borderRadius: 16
  },
  body: {
    flexDirection: 'row'
  },
  iconCircle: {
    marginRight: 24,
    marginTop: 4,
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999
  },
  bodyText: {
    flex: 1
  },
  actions: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center'
  }
});
