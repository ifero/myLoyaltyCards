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
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';
import { SYNC_TOKENS } from '@/shared/theme/sync-tokens';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type OfflineIndicatorProps = {
  isOffline: boolean;
  pendingChangeCount: number;
};

export const OfflineIndicator = ({ isOffline, pendingChangeCount }: OfflineIndicatorProps) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  if (!isOffline || pendingChangeCount <= 0) {
    return null;
  }

  const mode = isDark ? 'dark' : 'light';
  const backgroundColor = SYNC_TOKENS.offlineBg[mode];
  const textColor = SYNC_TOKENS.offlineText[mode];

  const message = t('syncUi.offline.message', { count: pendingChangeCount });

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View
        testID="offline-indicator"
        accessibilityRole="summary"
        accessibilityLabel={message}
        style={[styles.container, { backgroundColor }]}
      >
        <MaterialIcons testID="offline-icon" name="cloud-off" size={15} color={textColor} />
        <Text testID="offline-message" style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // On the card grid's 16pt margin, in line with the tiles below (Story 22.2).
    marginHorizontal: SPACING.md,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  message: {
    ...TYPOGRAPHY.labelBold,
    marginLeft: 16
  }
});
