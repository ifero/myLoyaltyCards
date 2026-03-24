import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme, SEMANTIC_COLORS } from '@/shared/theme';

type SyncIndicatorProps = {
  isSyncing: boolean;
  hasError?: boolean;
};

export const SyncIndicator = ({ isSyncing, hasError = false }: SyncIndicatorProps) => {
  const { theme } = useTheme();

  if (!isSyncing && !hasError) {
    return null;
  }

  const backgroundColor = hasError ? `${SEMANTIC_COLORS.error}1A` : `${theme.primary}1A`;
  const textColor = hasError ? SEMANTIC_COLORS.error : theme.textSecondary;
  const label = hasError ? 'Sync error — will retry' : 'Syncing cards…';

  return (
    <View
      testID="sync-indicator"
      className="mx-4 mb-2 flex-row items-center rounded-lg px-3 py-2"
      style={{ backgroundColor }}
      accessibilityLiveRegion="polite"
    >
      {isSyncing && !hasError && (
        <ActivityIndicator testID="sync-indicator-spinner" size="small" color={theme.primary} />
      )}
      <Text
        className={isSyncing && !hasError ? 'ml-2 text-xs' : 'text-xs'}
        style={{ color: textColor }}
      >
        {label}
      </Text>
    </View>
  );
};
