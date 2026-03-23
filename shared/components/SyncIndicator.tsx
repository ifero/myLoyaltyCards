import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';

type SyncIndicatorProps = {
  isSyncing: boolean;
};

export const SyncIndicator = ({ isSyncing }: SyncIndicatorProps) => {
  const { theme } = useTheme();

  if (!isSyncing) {
    return null;
  }

  return (
    <View
      testID="sync-indicator"
      className="mx-4 mb-2 flex-row items-center rounded-lg px-3 py-2"
      style={{ backgroundColor: `${theme.primary}1A` }}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator testID="sync-indicator-spinner" size="small" color={theme.primary} />
      <Text className="ml-2 text-xs" style={{ color: theme.textSecondary }}>
        Syncing cards to cloud…
      </Text>
    </View>
  );
};
