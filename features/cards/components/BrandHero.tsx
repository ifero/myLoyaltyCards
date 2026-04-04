/**
 * BrandHero Component
 * Story 13.3: Restyle Card Detail Screen (AC1)
 *
 * Brand-colored hero header for the Card Detail screen.
 * - Catalogue cards: brand hex bg + brand SVG logo + brand name
 * - Custom cards: user-selected color bg + first-letter avatar + card name
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type { LoyaltyCard } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme/colors';
import { getContrastForeground } from '@/shared/theme/luminance';
import { LAYOUT } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { useBrandLogo } from '../hooks/useBrandLogo';
import { getBrandLogoComponent } from '../utils/brandLogos';

interface BrandHeroProps {
  card: LoyaltyCard;
  testID?: string;
}

/** Minimum hero height */
const HERO_HEIGHT = 200;
const LOGO_SIZE = 80;
const AVATAR_SIZE = 72;

/**
 * BrandHero Component
 *
 * Renders a brand-colored hero section at the top of Card Detail.
 * - Catalogue cards show brand logo (SVG) or brand abbreviation fallback
 * - Custom cards show a circular first-letter avatar
 * - Brand/card name displayed below the logo/avatar
 */
export const BrandHero: React.FC<BrandHeroProps> = ({ card, testID }) => {
  const brand = useBrandLogo(card.brandId);

  const { backgroundColor, foregroundColor, displayName, firstLetter } = useMemo(() => {
    const isCatalogue = card.brandId !== null && brand !== undefined;
    const bgColor = isCatalogue ? brand!.color : (CARD_COLORS[card.color] ?? CARD_COLORS.grey);

    // Determine foreground color based on luminance
    const fgColor = getContrastForeground(bgColor);

    return {
      backgroundColor: bgColor,
      foregroundColor: fgColor,
      displayName: isCatalogue ? brand!.name : card.name,
      firstLetter: card.name.trim().charAt(0).toUpperCase() || 'C'
    };
  }, [card.brandId, card.color, card.name, brand]);

  const LogoComponent = brand ? getBrandLogoComponent(brand.logo) : undefined;

  return (
    <View testID={testID} style={[styles.container, { backgroundColor }]}>
      {card.brandId !== null && brand ? (
        // Catalogue card: logo slot
        <View testID={`${testID}-logo-slot`} style={styles.logoSlot}>
          {LogoComponent ? (
            <LogoComponent width={LOGO_SIZE} height={LOGO_SIZE} color={foregroundColor} />
          ) : (
            <Text style={[styles.brandAbbreviation, { color: foregroundColor }]}>
              {brand.name.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
      ) : (
        // Custom card: circular avatar
        <View testID={`${testID}-avatar`} style={styles.avatar}>
          <Text style={[styles.avatarText, { color: foregroundColor }]}>{firstLetter}</Text>
        </View>
      )}

      {/* Brand/Card Name */}
      <Text
        testID={`${testID}-name`}
        style={[styles.name, { color: foregroundColor }]}
        numberOfLines={2}
      >
        {displayName}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin,
    paddingTop: 16,
    paddingBottom: 20
  },
  logoSlot: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  brandAbbreviation: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700'
  },
  name: {
    ...TYPOGRAPHY.title2,
    textAlign: 'center'
  }
});
