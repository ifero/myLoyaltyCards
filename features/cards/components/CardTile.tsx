/**
 * CardTile Component
 * Story 13.2: Restyle Home Screen (AC1, AC7, AC9)
 * Story 16.22: Fix card-grid tile overlap on narrow screens (AC1, AC5, AC9)
 *
 * Brand-colored tile for the 2-column grid.
 * Catalogue cards show brand logo on brand hex bg.
 * Custom cards show first-letter avatar on user-selected color.
 * Card name displayed below tile.
 *
 * Sizing is supplied by the parent (`CardList`), which derives it from the
 * viewport via `utils/gridLayout`. The constants below are the design reference
 * at 390 dp and the fallback for callers that pass no size — they are NOT a
 * viewport-independent layout width. See gridLayout.ts for why that distinction
 * is the whole bug.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming
} from 'react-native-reanimated';

import { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import { CARD_COLORS } from '@/shared/theme/colors';
import { getLuminance } from '@/shared/theme/luminance';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BrandLogo } from './BrandLogo';
import { useBrandLogo } from '../hooks/useBrandLogo';
import { getBrandLogo } from '../utils/brandLogos';
import {
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  TILE_WIDTH
} from '../utils/gridLayout';

/**
 * Design reference tile dimensions (pt) at 390 dp, re-exported so this
 * component's public surface is unchanged. Canonical home: utils/gridLayout.ts.
 */
export {
  TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS
};

interface CardTileProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
  /** Enlarged single-card mode */
  enlarged?: boolean;
  /** Green border highlight for newly added card (fades after 2s) */
  highlighted?: boolean;
  /**
   * Applied tile width (pt), derived from the viewport by the parent.
   * Omit to fall back to the design reference constant.
   */
  tileWidth?: number;
  /** Applied tile height (pt). Omit to fall back to the design reference constant. */
  tileHeight?: number;
}

/**
 * CardTile Component
 *
 * - Grid mode: viewport-derived width at the 171:140 ratio, 16pt radius
 *   (exactly 171x140pt at the 390 dp design reference width)
 * - Enlarged (single-card) mode: 220x180pt with 20pt radius
 * - Brand hex background + centered logo / first-letter avatar
 * - Card name below tile (not inside the shell)
 * - Drop shadow: offset 0/2, blur 8, 8% opacity
 * - Dark mode: #40404A 1pt border on black-branded cards
 */
export const CardTile: React.FC<CardTileProps> = ({
  card,
  enlarged = false,
  highlighted = false,
  tileWidth: tileWidthProp,
  tileHeight: tileHeightProp
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const brand = useBrandLogo(card.brandId);
  const [isPressed, setIsPressed] = useState(false);

  // Highlight animation: green border fades out after 2 seconds
  const highlightOpacity = useSharedValue(highlighted ? 1 : 0);

  useEffect(() => {
    if (highlighted) {
      highlightOpacity.value = 1;
      highlightOpacity.value = withDelay(500, withTiming(0, { duration: 1500 }));
    }
  }, [highlighted, highlightOpacity]);

  const highlightStyle = useAnimatedStyle(() => ({
    borderWidth: highlightOpacity.value > 0 ? 3 : 0,
    borderColor: `rgba(76, 175, 80, ${highlightOpacity.value})`
  }));

  const handlePress = () => {
    router.push(`/card/${card.id}`);
  };

  // Applied size comes from the parent (viewport-derived). The constants are the
  // fallback for callers that pass no size — never a viewport-independent width.
  const tileWidth = tileWidthProp ?? (enlarged ? SINGLE_TILE_WIDTH : TILE_WIDTH);
  const tileHeight = tileHeightProp ?? (enlarged ? SINGLE_TILE_HEIGHT : TILE_HEIGHT);
  // Radius is fixed by design and deliberately does not scale with the tile.
  const tileRadius = enlarged ? SINGLE_TILE_RADIUS : TILE_RADIUS;

  // Resolve background color: brand hex for catalogue, card palette color for custom
  const backgroundColor = brand ? brand.color : (CARD_COLORS[card.color] ?? CARD_COLORS.grey);
  const luminance = getLuminance(backgroundColor);
  const isBlackBrand = luminance < 0.2;
  const isLightBrand = luminance > 0.85;

  // Determine foreground color for avatar text
  const foregroundColor = isBlackBrand ? '#FFFFFF' : '#1F1F24';
  const firstLetter = card.name.trim().charAt(0).toUpperCase() || 'C';

  const logo = brand ? getBrandLogo(brand.logo) : undefined;

  const logoWidth = Math.round(tileWidth * 0.85);
  const logoHeight = Math.round(tileHeight * 0.85);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={isPressed ? styles.pressed : undefined}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      accessibilityHint={t('cards.home.cardTileAccessibilityHint')}
    >
      {/* Tile */}
      <Animated.View
        style={[
          styles.tileContainer,
          {
            width: tileWidth,
            height: tileHeight,
            borderRadius: tileRadius,
            backgroundColor,
            borderWidth: isLightBrand || (isDark && isBlackBrand) ? 1 : 0,
            borderColor: isLightBrand
              ? isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(0,0,0,0.08)'
              : isDark && isBlackBrand
                ? '#40404A'
                : 'transparent'
          },
          !isDark && styles.shadow,
          highlighted && highlightStyle
        ]}
      >
        {logo ? (
          <BrandLogo source={logo} width={logoWidth} height={logoHeight} color={foregroundColor} />
        ) : brand ? (
          /* Catalogue card without SVG: brand name abbreviation fallback */
          <View style={styles.logoSlot}>
            <Text style={[styles.brandAbbreviation, { color: foregroundColor }]}>
              {brand.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        ) : (
          /* Custom card: first-letter circular avatar */
          <View style={styles.avatarCircle}>
            <Text style={[styles.avatarText, { color: foregroundColor }]}>{firstLetter}</Text>
          </View>
        )}

        {/* Favourite badge (Story 9.2 — AC2): shown only when pinned. White plate
            keeps the amber star legible on any tile colour, incl. light/yellow brands. */}
        {card.isFavorite && (
          <View style={styles.favouriteBadge} testID="favourite-badge">
            <MaterialIcons name="star" size={16} color={theme.warning} />
          </View>
        )}
      </Animated.View>

      {/* Card name below tile */}
      <Text
        style={[styles.cardName, { color: theme.textPrimary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {card.name}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7
  },
  favouriteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  tileContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8
      },
      android: {
        elevation: 3
      }
    })
  },
  logoSlot: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandAbbreviation: {
    fontWeight: '700',
    fontSize: 18
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700'
  },
  cardName: {
    fontSize: TYPOGRAPHY.footnote.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 2
  }
});
