/**
 * OfflineIndicator — reassuring offline strip with pending change count
 * Story 13.8: Restyle Sync & Status Indicators (AC4, AC7)
 *
 * Shows ONLY when offline AND pending changes > 0 (DEC-12.8-003).
 * Uses neutral/muted tokens — not warning/alarm colors.
 * Matches Figma: "Offline — Light/Dark".
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { useTheme } from '@/shared/theme';

type OfflineIndicatorProps = {
  pendingChangeCount: number;
};

export const OfflineIndicator = ({ pendingChangeCount }: OfflineIndicatorProps) => {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const { isDark } = useTheme();
  const isOffline = !isConnected || !isInternetReachable;

  if (!isOffline || pendingChangeCount <= 0) {
    return null;
  }

  // Neutral/muted tokens from Figma — reassurance, not alarm
  const backgroundColor = isDark ? '#4A3A1A' : '#FFF3D6';
  const textColor = isDark ? '#FFD60A' : '#EF9500';

  const message =
    pendingChangeCount === 1
      ? 'Offline \u2022 1 change will sync when online'
      : `Offline \u2022 ${pendingChangeCount} changes will sync when online`;

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View
        testID="offline-indicator"
        accessibilityRole="status"
        accessibilityLabel={message}
        className="mx-4 mt-2 flex-row items-center rounded-xl px-3 py-2"
        style={{ backgroundColor }}
      >
        <MaterialIcons testID="offline-icon" name="cloud-off" size={15} color={textColor} />
        <Text
          testID="offline-message"
          className="ml-2"
          style={{
            color: textColor,
            fontSize: 12,
            fontWeight: '500',
            lineHeight: 16
          }}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};
