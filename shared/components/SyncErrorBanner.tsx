import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { SEMANTIC_COLORS } from '@/shared/theme/colors';

type SyncErrorBannerProps = {
  message: string | null;
  onRetry: () => void;
  onDismiss: () => void;
};

const ERROR_BG = '#FEF2F2';
const ERROR_TEXT = '#991B1B';

export const SyncErrorBanner = ({ message, onRetry, onDismiss }: SyncErrorBannerProps) => {
  const { theme } = useTheme();

  if (!message) {
    return null;
  }

  return (
    <View
      testID="sync-error-banner"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="mx-4 mt-2 flex-row items-center rounded-lg border px-4 py-3"
      style={{ backgroundColor: ERROR_BG, borderColor: SEMANTIC_COLORS.error }}
    >
      <Text
        testID="sync-error-message"
        className="flex-1 text-sm"
        style={{ color: ERROR_TEXT }}
        numberOfLines={2}
      >
        {message}
      </Text>

      <Pressable
        testID="sync-error-retry-button"
        onPress={onRetry}
        accessibilityLabel="Retry cloud sync"
        accessibilityRole="button"
        className="ml-2 rounded-md px-3 py-1"
        style={{ backgroundColor: SEMANTIC_COLORS.error }}
      >
        <Text className="text-xs font-semibold text-white">Retry</Text>
      </Pressable>

      <Pressable
        testID="sync-error-dismiss-button"
        onPress={onDismiss}
        accessibilityLabel="Dismiss sync error"
        accessibilityRole="button"
        className="ml-2 px-1"
      >
        <Text style={{ color: theme.textPrimary, fontSize: 16 }}>✕</Text>
      </Pressable>
    </View>
  );
};
