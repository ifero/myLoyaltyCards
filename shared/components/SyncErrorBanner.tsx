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

  // Token-based colors from Figma error banner frames
  const bannerBg = isDark ? '#461E22' : '#FFECEC';
  const errorAccent = isDark ? '#FF453A' : '#FF5B30';
  const messageColor = isDark ? NEUTRAL_COLORS.white : theme.textPrimary;
  const dismissColor = isDark ? '#BEBFC5' : '#636366';

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)}>
      <View
        testID="sync-error-banner"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
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
          accessibilityRole="button"
          className="ml-2 items-center justify-center rounded-lg px-3 py-1"
          style={{
            backgroundColor: errorAccent,
            minHeight: TOUCH_TARGET.min / 1.5
          }}
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
