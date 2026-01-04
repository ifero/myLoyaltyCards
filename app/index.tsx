import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

/**
 * Home Screen
 *
 * Story 1.5: Main screen with card list (empty state placeholder).
 * Will be implemented in future stories with actual card list from database.
 */
const HomeScreen = () => {
  const { theme } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      {/* Empty state when no cards exist */}
      <Text
        className="text-6xl mb-4"
        accessibilityLabel="No cards icon"
      >
        💳
      </Text>
      <Text
        className="text-xl font-semibold mb-2 text-center"
        style={{ color: theme.textPrimary }}
      >
        No loyalty cards yet
      </Text>
      <Text
        className="text-base text-center"
        style={{ color: theme.textSecondary }}
      >
        Tap the + button to add your first card
      </Text>
    </View>
  );
};

export default HomeScreen;
