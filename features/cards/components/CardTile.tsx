/**
 * CardTile Component
 * Story 13.2: Restyle Home Screen (AC1, AC7, AC9)
 *
 * Brand-colored tile for the 2-column grid.
 * Catalogue cards show brand logo on brand hex bg.
 * Custom cards show first-letter avatar on user-selected color.
 * Card name displayed below tile.
 */

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
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
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { useBrandLogo } from '../hooks/useBrandLogo';
import { getBrandLogoComponent } from '../utils/brandLogos';

/**
 * Returns true if a hex color is perceptually dark (relative luminance < 0.2).
 * Uses simplified sRGB → luminance formula per WCAG 2.0.
 */
const isDarkBrandColor = (hex: string): boolean => {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.2;
};

/** Standard grid tile dimensions (pt) */
export const TILE_WIDTH = 171;
export const TILE_HEIGHT = 140;
export const TILE_RADIUS = 16;

/** Single-card enlarged tile dimensions */
export const SINGLE_TILE_WIDTH = 220;
export const SINGLE_TILE_HEIGHT = 180;
export const SINGLE_TILE_RADIUS = 20;

interface CardTileProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
  /** Enlarged single-card mode */
  enlarged?: boolean;
  /** Green border highlight for newly added card (fades after 2s) */
  highlighted?: boolean;
}

/**
 * CardTile Component
 *
 * - Grid mode: 171x140pt with 16pt radius
 * - Enlarged (single-card) mode: 220x180pt with 20pt radius
 * - Brand hex background + centered logo / first-letter avatar
 * - Card name below tile (not inside the shell)
 * - Drop shadow: offset 0/2, blur 8, 8% opacity
 * - Dark mode: #40404A 1pt border on black-branded cards
 */
export const CardTile: React.FC<CardTileProps> = ({
  card,
  enlarged = false,
  highlighted = false
}) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const brand = useBrandLogo(card.brandId);

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

  const tileWidth = enlarged ? SINGLE_TILE_WIDTH : TILE_WIDTH;
  const tileHeight = enlarged ? SINGLE_TILE_HEIGHT : TILE_HEIGHT;
  const tileRadius = enlarged ? SINGLE_TILE_RADIUS : TILE_RADIUS;

  // Resolve background color: brand hex for catalogue, card palette color for custom
  const backgroundColor = brand ? brand.color : (CARD_COLORS[card.color] ?? CARD_COLORS.grey);
  const isBlackBrand = isDarkBrandColor(backgroundColor);

  // Determine foreground color for avatar text
  const foregroundColor = isBlackBrand ? '#FFFFFF' : '#1F1F24';
  const firstLetter = card.name.trim().charAt(0).toUpperCase() || 'C';

  // Get SVG logo component if available
  const LogoComponent = brand ? getBrandLogoComponent(brand.logo) : undefined;

  // Logo sizing: fill most of the tile, letting SVG preserve its own aspect ratio
  const logoWidth = Math.round(tileWidth * 0.85);
  const logoHeight = Math.round(tileHeight * 0.65);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={card.name}
      accessibilityHint="Opens card details"
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
            borderWidth: isDark && isBlackBrand ? 1 : 0,
            borderColor: isDark && isBlackBrand ? '#40404A' : 'transparent'
          },
          !isDark && styles.shadow,
          highlighted && highlightStyle
        ]}
      >
        {LogoComponent ? (
          /* Catalogue card with SVG logo */
          <LogoComponent width={logoWidth} height={logoHeight} color={foregroundColor} />
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
