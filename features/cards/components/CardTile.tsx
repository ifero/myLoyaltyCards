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
 *
 * The tile's own children follow the same rule: the two centred fallback plates
 * (brand abbreviation, first-letter avatar) are sized from the tile and capped so
 * they clear the right-pinned favourite badge, which stays fixed for legibility.
 * `gridLayout.getFallbackChildMetrics` owns that arithmetic.
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
  AVATAR_SIZE,
  BADGE_INSET,
  BADGE_SIZE,
  LOGO_SLOT_SIZE,
  SINGLE_TILE_HEIGHT,
  SINGLE_TILE_RADIUS,
  SINGLE_TILE_WIDTH,
  TILE_HEIGHT,
  TILE_RADIUS,
  TILE_WIDTH,
  getFallbackChildMetrics
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

  // The two centred fallback plates track the tile and are capped so they cannot
  // reach the right-pinned favourite badge; the glyph inside holds 18 pt unless the
  // plate becomes too small for it. Only one branch renders, so only its reference
  // size is needed: a brand means the abbreviation slot, no brand means the
  // first-letter avatar. See gridLayout.getFallbackChildMetrics for the arithmetic.
  //
  // Note this does NOT apply to the SVG branch above: `logoWidth` is 85 % of the
  // tile and has always run under the badge (145 pt of 171 at the design reference).
  // That overlap is pre-existing and accepted — the badge's opaque plate reads fine
  // over a largely transparent logo, where two translucent plates would not.
  const fallback = getFallbackChildMetrics(tileWidth, brand ? LOGO_SLOT_SIZE : AVATAR_SIZE);

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
          <View style={[styles.logoSlot, { width: fallback.size, height: fallback.size }]}>
            <Text
              style={[
                styles.brandAbbreviation,
                { color: foregroundColor, fontSize: fallback.fontSize }
              ]}
            >
              {brand.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        ) : (
          /* Custom card: first-letter circular avatar */
          <View style={[styles.avatarCircle, { width: fallback.size, height: fallback.size }]}>
            <Text
              style={[styles.avatarText, { color: foregroundColor, fontSize: fallback.fontSize }]}
            >
              {firstLetter}
            </Text>
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
    // Sized from gridLayout's constants rather than literals, because the same two
    // numbers define the keep-out that the fallback plates are capped against. If
    // they could drift apart, the cap would silently stop matching the badge.
    top: BADGE_INSET,
    right: BADGE_INSET,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
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
  // `width`/`height` and `fontSize` for both fallback plates are applied inline from
  // getFallbackChildMetrics(), because they depend on the tile. The reference values
  // (64 / 48 / 18 pt at a 171 pt tile) live in gridLayout.ts as the ratio source.
  logoSlot: {
    // Fixed, like TILE_RADIUS — it degrades to a circle if the plate ever gets small
    // enough for that to bite, which is a graceful failure rather than a broken one.
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandAbbreviation: {
    fontWeight: '700'
  },
  avatarCircle: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
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
