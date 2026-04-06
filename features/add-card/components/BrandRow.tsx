/**
 * BrandRow Component
 * Story 13.4: Restyle Add Card Flow (AC1)
 *
 * Renders a single brand row in the Card Type Selection list.
 * Figma: 40pt colored circle (SVG logo or first-letter fallback) + brand name + chevron.
 * Separator line offset from left edge (starting at x=68 per Figma).
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { CatalogueBrand } from '@/catalogue/types';

interface BrandRowProps {
  brand: CatalogueBrand;
  onPress: (brand: CatalogueBrand) => void;
  showSeparator?: boolean;
  testID?: string;
}

const CIRCLE_SIZE = 40;

export const BrandRow: React.FC<BrandRowProps> = ({
  brand,
  onPress,
  showSeparator = true,
  testID
}) => {
  const { theme } = useTheme();
  const [isPressed, setIsPressed] = useState(false);
  const firstLetter = brand.name.charAt(0).toUpperCase();

  return (
    <View>
      <Pressable
        testID={testID}
        onPress={() => onPress(brand)}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={`${brand.name}`}
        style={[styles.row, { backgroundColor: isPressed ? theme.surfaceElevated : 'transparent' }]}
      >
        <View style={styles.rowContent}>
          {/* Brand circle */}
          <View style={[styles.circle, { backgroundColor: brand.color }]}>
            <Text style={styles.circleText}>{firstLetter}</Text>
          </View>

          {/* Brand name */}
          <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {brand.name}
          </Text>

          {/* Chevron */}
          <MaterialIcons name="chevron-right" size={24} color={theme.textTertiary} />
        </View>
      </Pressable>

      {/* Separator */}
      {showSeparator && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    minHeight: TOUCH_TARGET.min + 10,
    justifyContent: 'center'
  },
  rowContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  circleText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700'
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500'
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76,
    marginRight: 24
  }
});
