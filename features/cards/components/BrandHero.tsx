/**
 * BrandHero Component
 * Story 13.3: Restyle Card Detail Screen (AC1)
 * Story 22.3: Card Detail — the four Cardì card-detail frames
 *
 * The card's own field at the top of card detail, and nothing else on it:
 * - a catalogue card: its brand's hex, carrying the brand's logo straight on the field;
 * - a custom card: its accent, carrying a letter avatar.
 * The card's name sits below the hero, in the content (`CardDetails`).
 *
 * ONE view paints the field, from the top of the screen down: the hero runs up under the
 * transparent native bar by the bar's height, so the status-bar inset, the bar and the band are
 * one region rather than three boxes that happen to share a colour (three separately filled boxes
 * leave hairline seams where they meet). A window-tall extension above it keeps the field — never
 * the ground — showing when iOS bounces the scroll down at the top.
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type SharedValue
} from 'react-native-reanimated';

import type { LoyaltyCard } from '@/core/schemas';

import { useTheme } from '@/shared/theme';
import {
  CARD_COLORS,
  DEFAULT_CARD_COLOR_HEX,
  NEUTRAL_COLORS,
  toRgbChannels
} from '@/shared/theme/colors';
import { getContrastForeground } from '@/shared/theme/luminance';
import { MONOGRAM_TEXT_PROPS, monogram } from '@/shared/theme/typography';

import { BrandLogo } from './BrandLogo';
import { HERO_HEIGHT, fieldTakesHairline, getHeroContentOpacity } from './CardDetailHeader';
import { useBrandLogo } from '../hooks/useBrandLogo';
import { getBrandLogo } from '../utils/brandLogos';

interface BrandHeroProps {
  card: LoyaltyCard;
  /** The native bar's height: the hero runs up under the transparent bar by this much. */
  headerHeight?: number;
  /** The scroll view's offset, which fades the logo or avatar as the hero scrolls away. */
  scrollOffset?: SharedValue<number>;
  testID?: string;
}

const LOGO_SIZE = 80;
const AVATAR_SIZE = 80;

/** A dark field's avatar: a 16 % white wash, so the circle reads AS a circle (frame D). */
const AVATAR_WASH = `rgba(${toRgbChannels(NEUTRAL_COLORS.white)}, 0.16)`;

export const BrandHero: React.FC<BrandHeroProps> = ({
  card,
  headerHeight = 0,
  scrollOffset,
  testID
}) => {
  const brand = useBrandLogo(card.brandId);
  const { theme, isDark } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const restingOffset = useSharedValue(0);
  const offset = scrollOffset ?? restingOffset;

  const { field, foreground, firstLetter } = useMemo(() => {
    const isCatalogue = card.brandId !== null && brand !== undefined;
    const fieldColor = isCatalogue
      ? (brand?.color ?? DEFAULT_CARD_COLOR_HEX)
      : (CARD_COLORS[card.color] ?? DEFAULT_CARD_COLOR_HEX);

    return {
      field: fieldColor,
      foreground: getContrastForeground(fieldColor),
      firstLetter: card.name.trim().charAt(0).toUpperCase() || 'C'
    };
  }, [card.brandId, card.color, card.name, brand]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: getHeroContentOpacity(offset.value)
  }));

  const logo = brand ? getBrandLogo(brand.logo) : undefined;
  // White glyphs mean a dark field, which takes the wash; ink means a light one, where an ink
  // wash would muddy the field — over the beam-yellow accent it paints mustard — so the circle is
  // a 1pt ring in the foreground instead.
  const isDarkField = foreground === NEUTRAL_COLORS.white;
  const childTestID = (suffix: string) => (testID ? `${testID}-${suffix}` : undefined);

  return (
    <View
      testID={testID}
      style={[
        styles.hero,
        { height: HERO_HEIGHT + headerHeight, paddingTop: headerHeight, backgroundColor: field },
        fieldTakesHairline(field, isDark)
          ? { borderBottomWidth: 1, borderBottomColor: theme.border }
          : null
      ]}
    >
      <View
        testID={childTestID('extension')}
        style={[
          styles.extension,
          // Overlaps the band by 1pt, so no seam of the ground can open between the two.
          { top: 1 - windowHeight, height: windowHeight, backgroundColor: field }
        ]}
      />
      <Animated.View testID={childTestID('content')} style={[styles.content, contentStyle]}>
        {brand ? (
          <View
            testID={childTestID('logo-slot')}
            accessible
            accessibilityRole="image"
            accessibilityLabel={brand.name}
            style={styles.logoSlot}
          >
            {logo ? (
              <BrandLogo source={logo} width={LOGO_SIZE} height={LOGO_SIZE} color={foreground} />
            ) : (
              <Text
                {...MONOGRAM_TEXT_PROPS}
                style={[styles.brandAbbreviation, { color: foreground }]}
              >
                {brand.name.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
        ) : (
          <View
            testID={childTestID('avatar')}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.avatar,
              isDarkField
                ? { backgroundColor: AVATAR_WASH }
                : { borderWidth: 1, borderColor: foreground }
            ]}
          >
            <Text {...MONOGRAM_TEXT_PROPS} style={[styles.avatarText, { color: foreground }]}>
              {firstLetter}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  extension: {
    position: 'absolute',
    left: 0,
    right: 0
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoSlot: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center'
  },
  brandAbbreviation: {
    ...monogram(28),
    letterSpacing: 1
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    ...monogram(28)
  }
});
