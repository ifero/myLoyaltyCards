/**
 * SyncIndicator — inline sync status strip
 * Story 13.8: Restyle Sync & Status Indicators (AC1, AC2, AC7)
 *
 * Replaces ActivityIndicator with animated MI:sync glyph.
 * Handles syncing + success states with design-system tokens.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  useReducedMotion
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';
import type { SyncState } from '@/shared/types/sync-ui';

type SyncIndicatorProps = {
  syncState: SyncState;
  onSuccessDismissed?: () => void;
};

const AUTO_DISMISS_MS = 2500;

export const SyncIndicator = ({ syncState, onSuccessDismissed }: SyncIndicatorProps) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const rotation = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous rotation for sync glyph
  useEffect(() => {
    if (syncState === 'syncing' && !reducedMotion) {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [syncState, reducedMotion, rotation]);

  // Auto-dismiss success state
  useEffect(() => {
    if (syncState === 'success') {
      dismissTimerRef.current = setTimeout(() => {
        onSuccessDismissed?.();
      }, AUTO_DISMISS_MS);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [syncState, onSuccessDismissed]);

  const animatedRotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  if (syncState === 'idle' || syncState === 'error') {
    return null;
  }

  const isSyncing = syncState === 'syncing';
  const isSuccess = syncState === 'success';

  const mode = isDark ? 'dark' : 'light';
  const backgroundColor = isSyncing ? SYNC_TOKENS.syncingBg[mode] : SYNC_TOKENS.successBg[mode];
  const iconColor = isSyncing ? SYNC_TOKENS.syncingText[mode] : SYNC_TOKENS.successText[mode];
  const textColor = iconColor;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      testID="sync-indicator"
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        isSyncing ? t('syncUi.syncIndicator.syncingA11y') : t('syncUi.syncIndicator.successA11y')
      }
    >
      <View style={[styles.container, { backgroundColor }]}>
        {isSyncing ? (
          <Animated.View testID="sync-indicator-icon" style={animatedRotationStyle}>
            <MaterialIcons name="sync" size={16} color={iconColor} />
          </Animated.View>
        ) : isSuccess ? (
          <MaterialIcons
            testID="sync-success-icon"
            name="check-circle"
            size={16}
            color={iconColor}
          />
        ) : null}
        <Text testID="sync-indicator-label" style={[styles.label, { color: textColor }]}>
          {isSyncing
            ? t('syncUi.syncIndicator.syncingMessage')
            : t('syncUi.syncIndicator.successMessage')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 32,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  label: {
    marginLeft: 16,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16
  }
});
