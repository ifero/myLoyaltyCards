/**
 * BrandPill Component
 * Story 13.4: Restyle Add Card Flow (AC4)
 *
 * Rounded pill showing brand name + logo over the camera view.
 * Figma: brand-colored background, white text, centered horizontally at top.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { getContrastForeground } from '@/shared/theme/luminance';

import { getBrandLogoComponent } from '@/features/cards/utils/brandLogos';

import { CatalogueBrand } from '@/catalogue/types';

interface BrandPillProps {
  brand: CatalogueBrand;
  testID?: string;
}

const PILL_HEIGHT = 32;
const LOGO_SIZE = 16;

export const BrandPill: React.FC<BrandPillProps> = ({ brand, testID = 'brand-pill' }) => {
  const foregroundColor = getContrastForeground(brand.color);
  const LogoComponent = getBrandLogoComponent(brand.logo);

  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: brand.color }]}>
      {LogoComponent && (
        <View style={styles.logoContainer}>
          <LogoComponent width={LOGO_SIZE} height={LOGO_SIZE} color={foregroundColor} />
        </View>
      )}
      <Text style={[styles.text, { color: foregroundColor }]} numberOfLines={1}>
        {brand.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    paddingHorizontal: 16,
    gap: 6,
    zIndex: 10
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE
  },
  text: {
    fontSize: 14,
    fontWeight: '600'
  }
});
