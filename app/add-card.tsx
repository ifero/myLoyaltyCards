import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

/**
 * Add Card Screen
 *
 * Story 1.5: Placeholder screen for adding a new loyalty card.
 * Will be implemented in future stories with camera scanner and manual entry.
 */
const AddCardScreen = () => {
  const { theme } = useTheme();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      <Text
        className="text-2xl font-bold mb-2"
        style={{ color: theme.textPrimary }}
      >
        Add New Card
      </Text>
      <Text className="text-base text-center" style={{ color: theme.textSecondary }}>
        Card scanning and manual entry coming soon!
      </Text>
    </View>
  );
};

export default AddCardScreen;
