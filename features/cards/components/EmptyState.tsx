/**
 * EmptyState Component
 * Story 2.1: Display Card List (AC1)
 *
 * Displays friendly empty state when user has no cards saved.
 * Shows welcoming message, encouraging subtext, and Add Card CTA.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { useTheme } from '@/shared/theme';

/**
 * EmptyState Component
 *
 * Centered layout with:
 * - Card emoji icon (💳)
 * - Primary text: "No cards yet"
 * - Secondary text: "Add your first loyalty card to get started"
 * - CTA button: "Add Card" with Sage Green background
 */
export const EmptyState: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();

  const handleAddCard = () => {
    router.push('/add-card');
  };

  return (
    <View
      className="flex-1 items-center justify-center px-4"
      accessibilityRole="none"
    >
      {/* Icon */}
      <Text
        className="text-6xl mb-4"
        accessibilityLabel="Credit card icon"
      >
        💳
      </Text>

      {/* Primary text */}
      <Text
        className="text-xl font-bold mb-2 text-center"
        style={{ color: theme.textPrimary }}
        accessibilityRole="header"
      >
        No cards yet
      </Text>

      {/* Secondary text */}
      <Text
        className="text-sm text-center mb-6"
        style={{ color: theme.textSecondary }}
      >
        Add your first loyalty card to get started
      </Text>

      {/* CTA Button */}
      <Pressable
        onPress={handleAddCard}
        className="px-6 py-3 rounded-lg"
        style={{ backgroundColor: theme.primary }}
        accessibilityRole="button"
        accessibilityLabel="Add Card"
        accessibilityHint="Opens the add card screen"
      >
        <Text className="text-white font-semibold text-base">
          Add Card
        </Text>
      </Pressable>
    </View>
  );
};

