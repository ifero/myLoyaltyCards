/**
 * Card Details Screen (Placeholder)
 * Story 2.6: View Card Details
 *
 * This is a placeholder screen until Story 2.6 is implemented.
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, Text } from 'react-native';

import { useTheme } from '@/shared/theme';

const CardDetailsScreen = () => {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View
      className="flex-1 items-center justify-center p-4"
      style={{ backgroundColor: theme.background }}
    >
      <Text
        className="text-xl font-semibold mb-2 text-center"
        style={{ color: theme.textPrimary }}
      >
        Card Details
      </Text>
      <Text
        className="text-base text-center"
        style={{ color: theme.textSecondary }}
      >
        Card ID: {id}
      </Text>
      <Text
        className="text-sm text-center mt-4"
        style={{ color: theme.textSecondary }}
      >
        (Full implementation in Story 2.6)
      </Text>
    </View>
  );
};

export default CardDetailsScreen;

