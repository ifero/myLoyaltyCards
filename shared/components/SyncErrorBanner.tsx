/**
 * SyncErrorBanner — inline error banner with Retry + Dismiss
 * Story 13.8: Restyle Sync & Status Indicators (AC3, AC7)
 *
 * Uses design-system tokens. Matches Figma: "Sync Error — Light/Dark".
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

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
        className="mx-4 mt-2 flex-row items-center rounded-xl border px-3 py-3"
        style={{ backgroundColor: bannerBg, borderColor: errorAccent }}
      >
        <MaterialIcons
          testID="sync-error-icon"
          name="error-outline"
          size={18}
          color={errorAccent}
        />
        <Text
          testID="sync-error-message"
          className="ml-2 flex-1"
          style={{
            color: messageColor,
            fontSize: 12,
            lineHeight: 16
          }}
          numberOfLines={2}
        >
          {message}
        </Text>

        <Pressable
          testID="sync-error-retry-button"
          onPress={onRetry}
          accessibilityLabel="Retry cloud sync"
          accessibilityHint="Attempts to sync your cards to the cloud again"
          accessibilityRole="button"
          className="ml-2 items-center justify-center rounded-lg px-3 py-1"
          style={{
            backgroundColor: errorAccent,
            minHeight: TOUCH_TARGET.min
          }}
          hitSlop={8}
        >
          <Text
            style={{
              color: NEUTRAL_COLORS.white,
              fontSize: 12,
              fontWeight: '500'
            }}
          >
            Retry
          </Text>
        </Pressable>

        <Pressable
          testID="sync-error-dismiss-button"
          onPress={onDismiss}
          accessibilityLabel="Dismiss sync error"
          accessibilityHint="Hides the error message"
          accessibilityRole="button"
          className="ml-2 items-center justify-center"
          style={{ minWidth: TOUCH_TARGET.min, minHeight: TOUCH_TARGET.min }}
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color={dismissColor} />
        </Pressable>
      </View>
    </Animated.View>
  );
};
