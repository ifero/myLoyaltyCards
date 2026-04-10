/**
 * OfflineIndicator — reassuring offline strip with pending change count
 * Story 13.8: Restyle Sync & Status Indicators (AC4, AC7)
 *
 * Shows ONLY when offline AND pending changes > 0 (DEC-12.8-003).
 * Uses neutral/muted tokens — not warning/alarm colors.
 * Matches Figma: "Offline — Light/Dark".
 *
 * Offline state is passed as a prop (single source of truth from
 * SyncStatusContainer). This component does NOT read useNetworkStatus.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';

type OfflineIndicatorProps = {
  isOffline: boolean;
  pendingChangeCount: number;
};

export const OfflineIndicator = ({ isOffline, pendingChangeCount }: OfflineIndicatorProps) => {
  const { isDark } = useTheme();

  if (!isOffline || pendingChangeCount <= 0) {
    return null;
  }

  const mode = isDark ? 'dark' : 'light';
  const backgroundColor = SYNC_TOKENS.offlineBg[mode];
  const textColor = SYNC_TOKENS.offlineText[mode];

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
