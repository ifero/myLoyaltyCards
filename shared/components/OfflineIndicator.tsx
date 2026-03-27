import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';
import { SEMANTIC_COLORS } from '@/shared/theme';

export const OfflineIndicator = () => {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || !isInternetReachable;

  if (!isOffline) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View
        testID="offline-indicator"
        accessibilityRole="alert"
        accessibilityLabel="You're offline. Changes saved locally."
        className="mx-4 mt-2 rounded-lg border px-3 py-2"
        style={{
          borderColor: SEMANTIC_COLORS.warning,
          backgroundColor: `${SEMANTIC_COLORS.warning}1A`
        }}
      >
        <Text className="text-xs" style={{ color: SEMANTIC_COLORS.warning }}>
          You're offline. Changes saved locally.
        </Text>
      </View>
    </Animated.View>
  );
};
