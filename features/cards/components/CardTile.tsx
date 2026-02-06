/**
 * CardTile Component
 * Story 2.1: Display Card List (AC2, AC6)
 * Story 2.4: Display Virtual Logo
 * Story 3.3: Display official brand logo when brandId present
 *
 * Individual card tile for the grid layout.
 * Shows card name and brand logo (or Virtual Logo for custom cards).
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { SPACING } from '@/shared/theme/spacing';

import { VirtualLogo } from './VirtualLogo';
import { useBrandLogo } from '../hooks/useBrandLogo';

interface CardTileProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
}

/**
 * CardTile Component
 *
 * - Fixed 4:3 aspect ratio
 * - Card name at bottom (truncated > 20 chars with ellipsis)
 * - Official brand logo if brandId present (Story 3.3)
 * - Virtual Logo fallback for custom cards (colored square with initials)
 * - Pressable with opacity feedback
 * - Accessible with proper roles and labels
 */
export const CardTile: React.FC<CardTileProps> = ({ card }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const brand = useBrandLogo(card.brandId);

  const handlePress = () => {
    // Navigate to card details (Story 2.6)
    router.push(`/card/${card.id}`);
  };

  // Truncate card name to 20 characters
  const displayName = card.name.length > 20 ? `${card.name.slice(0, 20)}…` : card.name;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.surface },
        pressed && styles.pressed
      ]}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      accessibilityHint="Opens card details"
    >
      {/* Brand Logo or Virtual Logo */}
      <View style={styles.visualContainer}>
        {brand ? (
          /* Story 3.3: Show official brand logo placeholder */
          <View
            style={{
              width: 60,
              height: 60,
              backgroundColor: brand.color + '30',
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: brand.color, fontWeight: 'bold', fontSize: 16 }}>
              {brand.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        ) : (
          /* Fallback: Virtual Logo for custom cards */
          <VirtualLogo name={card.name} color={card.color} size={60} />
        )}
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
    margin: SPACING.sm / 2 // 4px for 8px total gap between items
  },
  pressed: {
    opacity: 0.7
  },
  visualContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm
  },
  nameContainer: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});
