/**
 * CardTile Component
 * Story 2.1: Display Card List (AC2, AC6)
 *
 * Individual card tile for the grid layout.
 * Shows card name and visual identifier (placeholder until Story 2.4).
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { CARD_COLORS } from '@/shared/theme/colors';
import { SPACING } from '@/shared/theme/spacing';

interface CardTileProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
}

/**
 * CardTile Component
 *
 * - Fixed 4:3 aspect ratio
 * - Card name at bottom (truncated > 20 chars with ellipsis)
 * - Visual identifier centered (colored square placeholder until Virtual Logo in 2.4)
 * - Pressable with opacity feedback
 * - Accessible with proper roles and labels
 */
export const CardTile: React.FC<CardTileProps> = ({ card }) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    // Navigate to card details (Story 2.6)
    router.push(`/card/${card.id}`);
  };

  // Truncate card name to 20 characters
  const displayName = card.name.length > 20
    ? `${card.name.slice(0, 20)}…`
    : card.name;

  // Get card color for visual identifier
  const cardColor = CARD_COLORS[card.color] || CARD_COLORS.grey;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      accessibilityHint="Opens card details"
    >
      {/* Visual identifier - placeholder colored square */}
      <View style={styles.visualContainer}>
        <View
          style={[styles.visualIdentifier, { backgroundColor: cardColor }]}
        >
          {/* First letter of card name */}
          <Text style={styles.visualLetter}>
            {card.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Card name */}
      <View style={styles.nameContainer}>
        <Text
          style={[styles.cardName, { color: theme.textPrimary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayName}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: SPACING.sm, // 8px
    overflow: 'hidden',
    margin: SPACING.sm / 2, // 4px for 8px total gap between items
  },
  pressed: {
    opacity: 0.7,
  },
  visualContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  visualIdentifier: {
    width: 60,
    height: 60,
    borderRadius: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nameContainer: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

