/**
 * CardDetails Component
 * Story 13.3: Restyle Card Detail Screen
 * Story 22.3: Card Detail — the four Cardì card-detail frames
 *
 * The card detail screen's content, top to bottom:
 * - the hero: the card's own field, running up under the transparent bar (`BrandHero`);
 * - the card's name;
 * - the barcode, on a white card that opens the full-screen barcode — the first thing below the
 *   name, so it is on screen at rest;
 * - the brightness bulb (Story 16.39);
 * - the details card: Number, Color (custom cards only), Added;
 * - MANAGE: Edit and Delete.
 *
 * The scroll view's offset drives the header's blend on the UI thread (`CardDetailHeader`), and a
 * scroll that comes to rest inside the blend settles to its nearer end.
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent
} from 'react-native';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useScrollOffset,
  type SharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_COLOR_KEYS, DEFAULT_CARD_COLOR, type LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { ActionRow } from '@/shared/components/ui/ActionRow';
import { SectionHeader } from '@/shared/components/ui/SectionHeader';
import { Surface } from '@/shared/components/ui/Surface';
import { useTheme } from '@/shared/theme';
import { BARCODE_FLASH } from '@/shared/theme/colors';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { LIGHT_THEME_COLORS } from '@/shared/theme/tokens.generated';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BarcodeRenderer } from './BarcodeRenderer';
import { BrandHero } from './BrandHero';
import { HEADER_BLEND_END, getBlendSettleOffset } from './CardDetailHeader';
import { DetailRow } from './DetailRow';
import { FullscreenBarcode } from './FullscreenBarcode';
import { useBrandLogo } from '../hooks/useBrandLogo';
import { MIN_QR_SIZE, RENDERER_SIDE_PADDING } from '../utils/barcodeGeometry';
import { formatBarcodeNumber } from '../utils/formatBarcode';

interface CardDetailsProps {
  /** The loyalty card to display */
  card: LoyaltyCard;
  /** Callback when copy is successful - for toast notifications */
  onCopy?: () => void;
  /** Callback when delete is confirmed - parent handles deletion logic */
  onDelete?: () => void;
  /** Whether delete operation is in progress */
  isDeleting?: boolean;
  /** Whether the screen is currently held at full brightness (Story 16.39). */
  isBrightnessBoosted?: boolean;
  /** Flip the brightness boost for this visit (Story 16.39). */
  onToggleBrightness?: () => void;
  /** The offset the scroll view writes, which the header follows. One of its own when omitted. */
  scrollOffset?: SharedValue<number>;
  /** The native bar's height, which the hero runs up under. */
  headerHeight?: number;
  /** Called when the scroll view lays out — it exists from then on. */
  onScrollViewLayout?: () => void;
}

/** A linear code's size on the card, as the frames draw it. */
const LINEAR_BARS_WIDTH = 280;
const LINEAR_BARS_HEIGHT = 100;

/** The barcode card's rounded corner and outline (`cardi-design-system.md` § _Shape_, _Elevation_). */
const BARCODE_CARD_RADIUS = 16;
const BARCODE_CARD_BORDER = 1;

/**
 * The widest a linear code may be drawn on this card: the window less the screen margin, the
 * card's border and the renderer's own white padding, each side. The renderer's padding is the
 * card's side padding; on a phone too narrow for 280 plus all three, the bars narrow rather than
 * the renderer's white running over the card's hairline.
 */
const getLinearBarsWidth = (windowWidth: number) =>
  Math.min(
    LINEAR_BARS_WIDTH,
    windowWidth - 2 * (LAYOUT.screenHorizontalMargin + BARCODE_CARD_BORDER + RENDERER_SIDE_PADDING)
  );

/** A card number grouped in fours — only when it is all digits; anything else shows as it is. */
const ALL_DIGITS = /^\d+$/;

/**
 * What the settle handler remembers between scroll events: whether a finger is down, and whether
 * the last release went on to decelerate.
 */
type SettleContext = { isDragging?: boolean; isDecelerating?: boolean };

/** Tap feedback — the design system's 0.98× scale, never a shadow bloom (§ _Elevation_). */
const PRESSED_SCALE = 0.98;

/**
 * Format date for display (e.g., "Jan 7, 2026")
 */
const formatDate = (isoString: string, locale: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const CardDetails: React.FC<CardDetailsProps> = ({
  card,
  onCopy,
  onDelete,
  isBrightnessBoosted = false,
  onToggleBrightness,
  isDeleting = false,
  scrollOffset,
  headerHeight = 0,
  onScrollViewLayout
}) => {
  const { theme } = useTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const brand = useBrandLogo(card.brandId);
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [isBarcodePressed, setIsBarcodePressed] = useState(false);
  const [isBulbPressed, setIsBulbPressed] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const locale = i18n.language?.startsWith('it') ? 'it-IT' : 'en-US';

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const offset = useScrollOffset(scrollRef, scrollOffset);
  const pixel = 1 / PixelRatio.get();

  // The scroll view mounts at rest. The offset outlives it — the screen owns it, and a reload
  // swaps this view out for a spinner and back — so it starts from the top with the view.
  useEffect(() => {
    offset.set(0);
  }, [offset]);

  // A scroll that comes to rest inside the blend settles to its nearer end. A release that goes on
  // to decelerate rests when its momentum ends (on Android every release reports momentum, fling
  // or not); one that does not decelerate rests where it is released, whatever velocity it reports
  // — iOS decides deceleration separately, and reports no momentum at all when there is none.
  // Scrolls that are not drags — a screen reader bringing a row into view, a hardware keyboard —
  // can still rest inside the band. A momentum end that arrives while a finger is down is not a
  // rest: on Android a touch that stops a moving scroll cancels its animator, which reports a
  // momentum end mid-band, and settling then would fight the finger.
  const settleScroll = useAnimatedScrollHandler<SettleContext>({
    onBeginDrag: (_event, context) => {
      context.isDragging = true;
    },
    onEndDrag: (event, context) => {
      context.isDragging = false;
      context.isDecelerating = false;
      const target = getBlendSettleOffset(event.contentOffset.y, pixel);
      if (target !== null) {
        // On the next frame: a release that decelerates has reported its momentum by then (both
        // platforms report it straight after the release), and iOS reports the release from
        // inside UIKit's own end-of-drag callback (`scrollViewWillEndDragging`), from which a
        // scroll started at once is not guaranteed to survive.
        requestAnimationFrame(() => {
          if (!context.isDecelerating) {
            scrollTo(scrollRef, 0, target, true);
          }
        });
      }
    },
    onMomentumBegin: (_event, context) => {
      context.isDecelerating = true;
    },
    onMomentumEnd: (event, context) => {
      if (context.isDragging) {
        return;
      }
      const target = getBlendSettleOffset(event.contentOffset.y, pixel);
      if (target !== null) {
        scrollTo(scrollRef, 0, target, true);
      }
    }
  });

  // Every card can scroll far enough to condense the header: the content is at least the scroll
  // view's own height plus the hero and the blend. Measured rather than taken from the window,
  // which the scroll view's height need not match — a taller one would cut the range short.
  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setViewportHeight(event.nativeEvent.layout.height);
      onScrollViewLayout?.();
    },
    [onScrollViewLayout]
  );

  const isQR = card.barcodeFormat === 'QR';
  const isCustomCard = brand === undefined;
  const colorKey = (CARD_COLOR_KEYS as readonly string[]).includes(card.color)
    ? card.color
    : DEFAULT_CARD_COLOR;
  const cardNumber = ALL_DIGITS.test(card.barcode)
    ? formatBarcodeNumber(card.barcode)
    : card.barcode;

  /**
   * Copy barcode number to clipboard with haptic feedback
   */
  const handleCopyBarcode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(card.barcode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onCopy?.();
    } catch (error) {
      logger.error('Failed to copy barcode:', error);
      Alert.alert(t('cards.details.copyFailedTitle'), t('cards.details.copyFailedMessage'));
    }
  }, [card.barcode, onCopy, t]);

  /**
   * Open fullscreen barcode overlay
   */
  const handleOpenFullscreen = useCallback(() => {
    setFullscreenVisible(true);
  }, []);

  /**
   * Close fullscreen barcode overlay
   */
  const handleCloseFullscreen = useCallback(() => {
    setFullscreenVisible(false);
  }, []);

  /**
   * Navigate to Edit Card screen
   */
  const handleEditCard = useCallback(() => {
    router.push(`/card/${card.id}/edit`);
  }, [router, card.id]);

  /**
   * Show delete confirmation dialog
   */
  const handleDeleteCard = useCallback(() => {
    Alert.alert(
      t('cards.details.deleteConfirmTitle'),
      t('cards.details.deleteConfirmBody', { name: card.name }),
      [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete?.();
          }
        }
      ],
      { cancelable: true }
    );
  }, [card.name, onDelete, t]);

  return (
    <>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={settleScroll}
        onLayout={handleScrollViewLayout}
        // The hero runs under the transparent bar by design, so iOS must not inset the content.
        contentInsetAdjustmentBehavior="never"
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + SPACING.xl },
          viewportHeight > 0 ? { minHeight: viewportHeight + HEADER_BLEND_END } : null
        ]}
        showsVerticalScrollIndicator={false}
        testID="card-details-scroll"
      >
        <BrandHero
          card={card}
          headerHeight={headerHeight}
          scrollOffset={offset}
          testID="card-details-hero"
        />

        <View style={styles.stack} testID="card-details-stack">
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={[styles.name, { color: theme.textPrimary }]}
            testID="card-details-name"
          >
            {card.name}
          </Text>

          {/* The barcode card. Nothing is drawn over the bars: the hint sits below them, inside
              the card, which stays white in both schemes because the bars are black on white. */}
          <Pressable
            onPress={handleOpenFullscreen}
            onPressIn={() => setIsBarcodePressed(true)}
            onPressOut={() => setIsBarcodePressed(false)}
            style={[
              styles.barcodeCard,
              { borderColor: theme.border },
              isBarcodePressed ? styles.pressed : null
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('cards.details.viewFullscreenAccessibilityLabel')}
            accessibilityHint={t('cards.details.viewFullscreenHint')}
            testID="card-details-barcode-preview"
          >
            <BarcodeRenderer
              value={card.barcode}
              format={card.barcodeFormat}
              width={isQR ? MIN_QR_SIZE : getLinearBarsWidth(windowWidth)}
              height={isQR ? MIN_QR_SIZE : LINEAR_BARS_HEIGHT}
            />
            <Text style={styles.barcodeHint}>{t('cards.details.tapToEnlarge')}</Text>
          </Pressable>

          {/* Brightness toggle (Story 16.39).
              Rendered only when the screen supplies a handler, so `CardDetails` stays usable
              without one (Storybook, and any future read-only surface).

              ICON ONLY, and a BULB (ifero, 2026-09-08 — "isn't it faster to understand?"): a bulb
              reads as light at a glance and needs no caption, which matters on the one screen
              whose whole job is to present a barcode. The state is carried by the bulb's fill —
              filled means on — so no word is needed to say which way it is set.

              ⚠️ With no visible text, `accessibilityLabel` is the ONLY thing a screen reader has
              for this control; it is load-bearing rather than supplementary, and a test pins it.
              `accessibilityRole="switch"` rather than `"button"` because it has an on/off state,
              and the role is what makes the platform announce that state. */}
          {onToggleBrightness ? (
            <Pressable
              onPress={onToggleBrightness}
              onPressIn={() => setIsBulbPressed(true)}
              onPressOut={() => setIsBulbPressed(false)}
              accessibilityRole="switch"
              accessibilityState={{ checked: isBrightnessBoosted }}
              accessibilityLabel={t('cards.details.brightnessToggleLabel')}
              accessibilityHint={t('cards.details.brightnessToggleHint')}
              style={[
                styles.brightnessToggle,
                {
                  borderColor: isBrightnessBoosted ? theme.primary : theme.border,
                  backgroundColor: isBrightnessBoosted ? `${theme.primary}1A` : 'transparent'
                },
                isBulbPressed ? styles.pressed : null
              ]}
              testID="card-details-brightness-toggle"
            >
              <Lightbulb
                testID="card-details-brightness-icon"
                size={24}
                strokeWidth={1.5}
                color={isBrightnessBoosted ? theme.primary : theme.textSecondary}
                fill={isBrightnessBoosted ? theme.primary : 'none'}
              />
            </Pressable>
          ) : null}

          <View style={styles.details}>
            <Surface divided testID="card-details-info-section">
              <DetailRow
                label={t('cards.details.numberLabel')}
                value={cardNumber}
                mono
                onPress={handleCopyBarcode}
                accessibilityHint={t('cards.details.copyAccessibilityHint')}
                testID="card-details-barcode-number"
              />
              {/* The accent's name, for a card with no catalogue brand only: a branded card's
                  colour is its brand's, never the stored key. */}
              {isCustomCard ? (
                <DetailRow
                  label={t('cards.details.colorLabel')}
                  value={t(`cards.colors.${colorKey}`)}
                  testID="card-details-color"
                />
              ) : null}
              <DetailRow
                label={t('cards.details.addedLabel')}
                value={formatDate(card.createdAt, locale)}
                testID="card-details-date"
              />
            </Surface>
          </View>

          <View style={styles.manage} testID="card-details-manage-section">
            <SectionHeader title={t('cards.details.manageSection')} />
            <Surface divided testID="card-details-manage-rows">
              <ActionRow
                variant="plain"
                showBottomBorder={false}
                label={t('cards.details.editAction')}
                onPress={handleEditCard}
                disabled={isDeleting}
                testID="card-details-edit-row"
              />
              <ActionRow
                variant="plain"
                showBottomBorder={false}
                destructive
                showChevron={false}
                label={isDeleting ? t('cards.details.deleting') : t('cards.details.deleteAction')}
                accessibilityLabel={
                  isDeleting
                    ? t('cards.details.deletingAccessibilityLabel')
                    : t('cards.details.deleteAccessibilityLabel')
                }
                onPress={handleDeleteCard}
                disabled={isDeleting}
                testID="card-details-delete-row"
              />
            </Surface>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Fullscreen Barcode Overlay (AC6) */}
      <FullscreenBarcode
        card={card}
        visible={fullscreenVisible}
        onClose={handleCloseFullscreen}
        onCopy={onCopy}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  stack: {
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  // The name heads the content, 16 above and below; two lines at most, so a long name never
  // pushes the barcode below the fold.
  name: {
    ...TYPOGRAPHY.headlineMd,
    marginVertical: SPACING.md
  },
  // White in both schemes, a 1pt hairline, 16 radius, no shadow. The renderer's own white padding
  // is the card's side padding (see `getLinearBarsWidth`); top and bottom are 16.
  barcodeCard: {
    alignItems: 'center',
    backgroundColor: BARCODE_FLASH.background,
    borderWidth: BARCODE_CARD_BORDER,
    borderRadius: BARCODE_CARD_RADIUS,
    paddingVertical: SPACING.md
  },
  // Inside the always-white card, so its colour is the light scheme's in both. Padded and centred,
  // so at the largest text sizes it wraps in centred lines clear of the card's hairline.
  barcodeHint: {
    ...TYPOGRAPHY.captionMd,
    color: LIGHT_THEME_COLORS.textSecondary,
    marginTop: SPACING.smMd,
    paddingHorizontal: SPACING.md,
    textAlign: 'center'
  },
  pressed: {
    transform: [{ scale: PRESSED_SCALE }]
  },
  brightnessToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    // A circle, not a pill: there is no label to make room for. Sized to the minimum tap target
    // on both axes so an icon-only control stays reachable — the 24 pt glyph alone would not be.
    width: TOUCH_TARGET.min,
    height: TOUCH_TARGET.min,
    borderRadius: TOUCH_TARGET.min / 2,
    borderWidth: 1,
    marginTop: SPACING.md
  },
  details: {
    marginTop: SPACING.lg
  },
  // "MANAGE" sits 24 below the details card and 8 above its rows.
  manage: {
    marginTop: SPACING.lg,
    gap: SPACING.sm
  }
});
