/**
 * BrandRow Component
 * Story 13.4: Restyle Add Card Flow (AC1)
 *
 * Renders a single brand row in the Card Type Selection list.
 * Figma: 40pt colored circle (SVG logo or first-letter fallback) + brand name + chevron.
 * Separator line offset from left edge (starting at x=68 per Figma).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ActionRow } from '@/shared/components/ui';

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
  const firstLetter = brand.name.charAt(0).toUpperCase();

  const leading = (
    <View style={[styles.circle, { backgroundColor: brand.color }]}>
      <Text style={styles.circleText}>{firstLetter}</Text>
    </View>
  );

  return (
    <ActionRow
      testID={testID}
      variant="plain"
      prefix={leading}
      label={brand.name}
      onPress={() => onPress(brand)}
      showBottomBorder={showSeparator}
      accessibilityLabel={brand.name}
    />
  );
};

const styles = StyleSheet.create({
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
  }
});
