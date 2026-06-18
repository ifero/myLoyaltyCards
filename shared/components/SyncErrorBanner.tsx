/**
 * SyncErrorBanner — inline error banner with Retry + Dismiss
 * Story 13.8: Restyle Sync & Status Indicators (AC3, AC7)
 *
 * Uses design-system tokens. Matches Figma: "Sync Error — Light/Dark".
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';
import { NEUTRAL_COLORS } from '@/shared/theme/colors';
import { TOUCH_TARGET } from '@/shared/theme/spacing';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';

type SyncErrorBannerProps = {
  message: string | null;
  onRetry: () => void;
  onDismiss: () => void;
};

export const SyncErrorBanner = ({ message, onRetry, onDismiss }: SyncErrorBannerProps) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();

  if (!message) {
    return null;
  }

  const mode = isDark ? 'dark' : 'light';
  const bannerBg = SYNC_TOKENS.errorBg[mode];
  const errorAccent = SYNC_TOKENS.errorAccent[mode];
  const messageColor = isDark ? NEUTRAL_COLORS.white : theme.textPrimary;
  const dismissColor = SYNC_TOKENS.errorDismiss[mode];

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
      <View
        testID="sync-error-banner"
        accessibilityRole="alert"
        style={[styles.banner, { backgroundColor: bannerBg, borderColor: errorAccent }]}
      >
        <MaterialIcons
          testID="sync-error-icon"
          name="error-outline"
          size={18}
          color={errorAccent}
        />
        <Text
          testID="sync-error-message"
          style={[styles.message, { color: messageColor }]}
          numberOfLines={2}
        >
          {message}
        </Text>

        <Pressable
          testID="sync-error-retry-button"
          onPress={onRetry}
          accessibilityLabel={t('syncUi.errorBanner.retryA11yLabel')}
          accessibilityHint={t('syncUi.errorBanner.retryA11yHint')}
          accessibilityRole="button"
          style={[styles.retryButton, { backgroundColor: errorAccent }]}
          hitSlop={8}
        >
          <Text style={styles.retryLabel}>{t('syncUi.errorBanner.retryButton')}</Text>
        </Pressable>

        <Pressable
          testID="sync-error-dismiss-button"
          onPress={onDismiss}
          accessibilityLabel={t('syncUi.errorBanner.dismissA11yLabel')}
          accessibilityHint={t('syncUi.errorBanner.dismissA11yHint')}
          accessibilityRole="button"
          style={styles.dismissButton}
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color={dismissColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 32,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 24
  },
  message: {
    marginLeft: 16,
    flex: 1,
    fontSize: 12,
    lineHeight: 16
  },
  retryButton: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
    minHeight: TOUCH_TARGET.min
  },
  retryLabel: {
    color: NEUTRAL_COLORS.white,
    fontSize: 12,
    fontWeight: '500'
  },
  dismissButton: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: TOUCH_TARGET.min,
    minHeight: TOUCH_TARGET.min
  }
});
