/**
 * VirtualLogo Component
 * Story 2.4: Display Virtual Logo (AC1, AC3, AC4, AC5)
 *
 * Displays a colored square with initials for cards without brand logos.
 * Used as the visual identifier in the card list and detail screens.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

import { CardColor } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme/colors';

import { generateInitials } from '../utils/initials';

interface VirtualLogoProps {
  /** Card name to generate initials from */
  name: string;
  /** Card color for the background */
  color: CardColor;
  /** Logo size in pixels (default: 80) */
  size?: number;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Test ID for E2E testing */
  testID?: string;
}

/**
 * VirtualLogo Component
 *
 * - Square shape with 10% border radius
 * - Background: Card's selected color from 5-color palette
 * - Text: White, bold, centered
 * - Font size: 40% of container for 1 initial, 30% for 2-3 initials
 *
 * Memoized for performance in long lists (FlatList).
 */
export const VirtualLogo = React.memo(function VirtualLogo({
  name,
  color,
  size = 80,
  style,
  testID
}: VirtualLogoProps) {
  const { initials, backgroundColor, fontSize, borderRadius } = useMemo(() => {
    const generatedInitials = generateInitials(name);
    return {
      initials: generatedInitials,
      backgroundColor: CARD_COLORS[color] || CARD_COLORS.grey,
      fontSize: generatedInitials.length === 1 ? size * 0.4 : size * 0.3,
      borderRadius: size * 0.1
    };
  }, [name, color, size]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius
        },
        style
      ]}
      accessibilityLabel={`${name} card logo`}
      testID={testID}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize
          }
        ]}
      >
        {initials}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1
  }
});
