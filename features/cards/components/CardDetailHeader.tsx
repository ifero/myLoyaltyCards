/**
 * Card detail's header: the scroll choreography, the bar's background and its title
 * Story 22.3: Card Detail — the four Cardì card-detail frames
 *
 * At rest the status-bar inset, the header and the hero read as ONE field: the bar is transparent
 * and the hero runs up under it (`BrandHero`). While any of the hero is still below the bar, the
 * bar shows exactly the hero's colour — it IS the hero. Once the hero has gone, the bar blends from
 * the field to the ground colour over 48pt of scroll as the title fades in, in step; then it settles
 * on the ground colour with a 1pt hairline (frames A → B → C). Everything is driven by the scroll
 * offset on the UI thread — scroll back and every step reverses; nothing is timed, so Reduce Motion
 * needs nothing.
 *
 * These render inside the NATIVE header, so this file deliberately imports nothing from
 * `react-native-unistyles` and lives outside `app/` (see `HeaderIconButton`).
 */

import React from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue
} from 'react-native-reanimated';

import { getTileAppearance } from '@/shared/components/ui/Tile';
import { useTheme } from '@/shared/theme';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

/** The hero band's height below the bar — and so the offset at which the whole hero has gone. */
export const HERO_HEIGHT = 200;

/** The blend starts the moment the last of the hero passes under the bar… */
export const HEADER_BLEND_START = HERO_HEIGHT;
/** …and runs over this much scroll. */
export const HEADER_BLEND_DISTANCE = 48;
export const HEADER_BLEND_END = HEADER_BLEND_START + HEADER_BLEND_DISTANCE;
/** Where the controls, the favourite star and the status bar flip to the scheme's colours. */
export const HEADER_BLEND_MIDPOINT = HEADER_BLEND_START + HEADER_BLEND_DISTANCE / 2;

/** The hero's logo or avatar fades out over the first this-much of scroll. */
export const HERO_CONTENT_FADE_DISTANCE = 100;

/**
 * The title clears both controls: a 48pt button on the 24pt margin, plus an 8pt gap, each side.
 * Without the cap a long name ran under both iOS 26 glass buttons.
 */
const TITLE_SIDE_CLEARANCE = TOUCH_TARGET.min + LAYOUT.screenHorizontalMargin + SPACING.sm;

/** The opacity of each of the bar's three layers. */
export type HeaderLayers = {
  /** The ground colour: cream in light, black in dark. */
  ground: number;
  /** The card's field, over the ground. */
  field: number;
  /** The 1pt `border` rule along the bar's bottom edge. */
  hairline: number;
};

/**
 * Where the condensed state begins: one physical pixel short of the blend's end, because Android
 * scrolls in whole pixels and on some densities can never land on 248 exactly.
 */
const getCondensedOffset = (pixel: number): number => {
  'worklet';
  return HEADER_BLEND_END - pixel;
};

/**
 * The bar's layers at a scroll offset. Below the blend both colour layers are hidden — the hero
 * is under the bar, so the bar shows the hero itself. At the blend's start the ground and the
 * field appear together, the field opaque, so nothing changes on screen; the field then fades out
 * over the ground, and the hairline appears at the end.
 *
 * A light field keeps its rule all the way: the hero draws one along its bottom edge on cream
 * (`fieldTakesHairline`), and an opaque field over the bar would otherwise cover it exactly when
 * the scroll rests at the blend's start.
 *
 * @param pixel - One physical pixel, in points: `1 / PixelRatio.get()`.
 */
export const getHeaderLayers = (
  offset: number,
  pixel: number,
  fieldHasHairline: boolean
): HeaderLayers => {
  'worklet';
  if (offset < HEADER_BLEND_START) {
    return { ground: 0, field: 0, hairline: 0 };
  }
  if (offset >= getCondensedOffset(pixel)) {
    return { ground: 1, field: 0, hairline: 1 };
  }
  return {
    ground: 1,
    field: interpolate(offset, [HEADER_BLEND_START, HEADER_BLEND_END], [1, 0], Extrapolation.CLAMP),
    hairline: fieldHasHairline ? 1 : 0
  };
};

/** The condensed title's opacity: it fades in with the blend, in step with the field fading out. */
export const getHeaderTitleOpacity = (offset: number, pixel: number): number => {
  'worklet';
  if (offset >= getCondensedOffset(pixel)) {
    return 1;
  }
  return interpolate(offset, [HEADER_BLEND_START, HEADER_BLEND_END], [0, 1], Extrapolation.CLAMP);
};

/** The hero's logo or avatar fades as the hero scrolls away, and stays whole on an overscroll. */
export const getHeroContentOpacity = (offset: number): number => {
  'worklet';
  return interpolate(offset, [0, HERO_CONTENT_FADE_DISTANCE], [1, 0], Extrapolation.CLAMP);
};

/** Past the midpoint the bar is more ground than field, so its controls take the scheme's colours. */
export const isPastBlendMidpoint = (offset: number): boolean => {
  'worklet';
  return offset >= HEADER_BLEND_MIDPOINT;
};

/**
 * Where a scroll that came to rest at `offset` settles: the blend band's nearer end when it rests
 * inside the band, and nowhere (`null`) when it rests outside it. A drag never leaves the bar
 * half-faded — red over cream would rest on salmon and yellow over black on olive, both banned.
 */
export const getBlendSettleOffset = (offset: number, pixel: number): number | null => {
  'worklet';
  if (offset <= HEADER_BLEND_START || offset >= getCondensedOffset(pixel)) {
    return null;
  }
  return isPastBlendMidpoint(offset) ? HEADER_BLEND_END : HEADER_BLEND_START;
};

/**
 * Whether the card's field takes a 1pt `border` rule along its bottom edge: a very light field in
 * the light scheme, which would otherwise dissolve into the cream ground. Lightness is the card
 * tile's own test (`getTileAppearance`), so the hero and the tile agree on which fields are light.
 * The tile also outlines a near-black fill in dark; card detail does not, so a near-black field in
 * dark still takes no rule here.
 */
export const fieldTakesHairline = (fieldColor: string, isDark: boolean): boolean =>
  !isDark && getTileAppearance(fieldColor).isLight;

type CardDetailHeaderBackgroundProps = {
  /** The card's field: its catalogue brand's hex, or a custom card's accent. */
  fieldColor: string;
  /** The scroll view's offset. */
  scrollOffset: SharedValue<number>;
};

/**
 * The bar's background (`headerBackground`, pinned behind the transparent native bar): the ground,
 * the field over it and the hairline, each following the scroll offset. Never a shadow.
 */
export const CardDetailHeaderBackground = ({
  fieldColor,
  scrollOffset
}: CardDetailHeaderBackgroundProps) => {
  const { theme, isDark } = useTheme();
  const pixel = 1 / PixelRatio.get();
  const fieldHasHairline = fieldTakesHairline(fieldColor, isDark);

  const groundStyle = useAnimatedStyle(() => ({
    opacity: getHeaderLayers(scrollOffset.value, pixel, fieldHasHairline).ground
  }));
  const fieldStyle = useAnimatedStyle(() => ({
    opacity: getHeaderLayers(scrollOffset.value, pixel, fieldHasHairline).field
  }));
  const hairlineStyle = useAnimatedStyle(() => ({
    opacity: getHeaderLayers(scrollOffset.value, pixel, fieldHasHairline).hairline
  }));

  return (
    <View testID="card-detail-header-background" style={styles.background}>
      <Animated.View
        testID="card-detail-header-ground"
        style={[styles.layer, { backgroundColor: theme.background }, groundStyle]}
      />
      <Animated.View
        testID="card-detail-header-field"
        style={[styles.layer, { backgroundColor: fieldColor }, fieldStyle]}
      />
      <Animated.View
        testID="card-detail-header-hairline"
        style={[styles.hairline, { backgroundColor: theme.border }, hairlineStyle]}
      />
    </View>
  );
};

type CardDetailHeaderTitleProps = {
  /** The card's name. */
  title: string;
  /** The scroll view's offset. */
  scrollOffset: SharedValue<number>;
  /**
   * Whether the scroll is past the blend midpoint. Before it the title is (nearly) invisible, so it
   * is hidden from screen readers too; the name below the hero is the screen's heading until then.
   */
  isPastMidpoint: boolean;
};

/**
 * The condensed title (`headerTitle`): the card's name in `bodyLgStrong`, `textPrimary`, one line,
 * fading in with the blend. It does not scale with Dynamic Type, as the native title it replaces
 * does not: the bar does not grow, so a scaled title would only be cut off.
 */
export const CardDetailHeaderTitle = ({
  title,
  scrollOffset,
  isPastMidpoint
}: CardDetailHeaderTitleProps) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const pixel = 1 / PixelRatio.get();

  const opacityStyle = useAnimatedStyle(() => ({
    opacity: getHeaderTitleOpacity(scrollOffset.value, pixel)
  }));

  return (
    <Animated.Text
      testID="card-detail-header-title"
      numberOfLines={1}
      allowFontScaling={false}
      accessibilityRole="header"
      accessibilityElementsHidden={!isPastMidpoint}
      importantForAccessibility={isPastMidpoint ? 'auto' : 'no-hide-descendants'}
      style={[
        styles.title,
        { color: theme.textPrimary, maxWidth: width - 2 * TITLE_SIDE_CLEARANCE },
        opacityStyle
      ]}
    >
      {title}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none'
  },
  layer: {
    ...StyleSheet.absoluteFillObject
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1
  },
  title: {
    ...TYPOGRAPHY.bodyLgStrong,
    textAlign: 'center'
  }
});
