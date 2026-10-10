/**
 * BarcodeFlash Component
 * Story 2.5: Display Barcode (Barcode Flash)
 * Story 22.4: Barcode Flash — the three Cardì barcode frames
 *
 * The one full-screen barcode view — frames A (a linear code) and B (a QR code) — for both of its
 * hosts: card detail presents it in place, in a React Native `Modal`, and the `barcode/[id]` route
 * renders it for `cardi://barcode/<id>`. Either host closes it from `onDismiss`.
 *
 * A white field at full brightness, edge to edge in both schemes, holding the store name, the bare
 * code, its number and the hint, and nothing else:
 * - the ground is white and never fades or moves; only the content above it does, fading in once
 *   the host reports that it has brought the screen in (`isPresented`);
 * - every close runs the content's exit over the white first, and only then calls `onDismiss`: a
 *   tap anywhere (the number included), VoiceOver's escape, Android back and the host's `close()`
 *   fade the content out, and a swipe down slides it away;
 * - a long press on the number copies it, with a success haptic and no toast;
 * - the screen is at full brightness while it shows, and back where it was once it has closed.
 */

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { LoyaltyCard } from '@/core/schemas';
import { logger } from '@/core/utils/logger';

import { BARCODE_FLASH } from '@/shared/theme/colors';
import { LAYOUT, SPACING, TOUCH_TARGET } from '@/shared/theme/spacing';
import { LIGHT_THEME_COLORS } from '@/shared/theme/tokens.generated';
import { TYPOGRAPHY } from '@/shared/theme/typography';

import { BarcodeRenderer } from './BarcodeRenderer';
import { useBrightness } from '../hooks/useBrightness';

/**
 * Story 2.5's timings: the content fades in, fades out on a tap, and slides away on a swipe. Each
 * follows the system's Reduce Motion, which `withTiming` reads unless told otherwise.
 */
export const FADE_IN_MS = 200;
export const FADE_OUT_MS = 150;
export const SLIDE_OUT_MS = 200;
/** A swipe that falls short of closing settles the content back over this. */
const SETTLE_BACK_MS = 150;

/** Story 2.5's swipe: down past 100pt, or flung down faster than 500pt/s. */
export const SWIPE_CLOSE_DISTANCE = 100;
export const SWIPE_CLOSE_VELOCITY = 500;

/**
 * The code's box is 80 % of the window and never wider than 320pt — 314pt on a 393pt phone. The
 * white either side of it is the code's quiet zone, not a margin (`stitch-prompts-barcode.txt`,
 * finding 6). A QR code's box is a square of the same width.
 */
const BOX_WIDTH_RATIO = 0.8;
const MAX_BOX_WIDTH = 320;
/** A linear code's box is 200pt tall, and its bars run the whole of it. */
export const LINEAR_BOX_HEIGHT = 200;

/** The frames' stack: 24 under the name, 16 under the code, 40 under the number. */
const NAME_GAP = SPACING.lg;
const NUMBER_GAP = SPACING.md;
const HINT_GAP = 40;

/**
 * The number's 48pt target is padding round its 24pt line, taken back out of the gaps either side,
 * so the text keeps the frames' spacing however large the target.
 */
const NUMBER_TARGET_PADDING = (TOUCH_TARGET.min - TYPOGRAPHY.monoCode.lineHeight) / 2;

/** The width of the code's box in a window this wide. */
export const getBarcodeBoxWidth = (windowWidth: number): number =>
  Math.min(windowWidth * BOX_WIDTH_RATIO, MAX_BOX_WIDTH);

/**
 * Whether a swipe that has just ended closes the screen: one that went down past 100pt, or was
 * flung down. A worklet, so the pan decides on the UI thread; tested on its own, because the
 * gesture mock never fires.
 */
export const shouldSwipeClose = (translationY: number, velocityY: number): boolean => {
  'worklet';
  return translationY > SWIPE_CLOSE_DISTANCE || velocityY > SWIPE_CLOSE_VELOCITY;
};

/** What a host can ask of the view. */
export type BarcodeFlashHandle = {
  /** Closes the view as a tap does: the content fades out over the white, then `onDismiss`. */
  close: () => void;
};

export interface BarcodeFlashProps {
  /** The card whose code is shown. */
  card: LoyaltyCard;
  /**
   * Called once the content has gone, for the host to close — at most once in the view's life, so
   * a host that shows the barcode again mounts a new view rather than reusing a closed one.
   */
  onDismiss: () => void;
  /**
   * Whether the host has finished bringing the view in. A host's own transition fades the whole
   * screen in over the one beneath it, so until then the content waits, unseen, and the transition
   * brings in the white alone: the code is only ever drawn over white. The mirror of closing, where
   * the content goes before the host does. `true` by default, for a host that cannot tell when its
   * transition has ended: the content then fades in at once.
   */
  isPresented?: boolean;
  /**
   * React 19 passes `ref` as a prop. Its handle's `close()` is for a host asked to close from
   * outside the view — card detail's `Modal`, which Android back reaches instead of the view — so
   * that close, too, runs the content's exit before `onDismiss`.
   */
  ref?: React.Ref<BarcodeFlashHandle>;
}

export const BarcodeFlash = ({ card, onDismiss, isPresented = true, ref }: BarcodeFlashProps) => {
  const { t } = useTranslation();
  const { maximize, restore } = useBrightness();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Full brightness while the code shows, and the level from before it once the view has gone
  // (Story 2.5). Over card detail's own boost, that level is the boost's (Story 16.39).
  useEffect(() => {
    maximize();
    return () => {
      restore();
    };
  }, [maximize, restore]);

  // Set by every close, the swipe included, so a host that finishes presenting after it — a close
  // while the host was still bringing the view in — does not fade the content back in over its
  // exit, keeping the screen open.
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (isPresented && !isClosingRef.current) {
      opacity.value = withTiming(1, { duration: FADE_IN_MS });
    }
  }, [isPresented, opacity]);

  // The host closes once. A second close during an exit — a tap, a swipe, Android back — ends a
  // second animation, and an exit can end after the view has been taken down: the route's
  // `router.back()` would then leave the screen beneath as well.
  const canDismissRef = useRef(false);
  useEffect(() => {
    canDismissRef.current = true;
    return () => {
      canDismissRef.current = false;
    };
  }, []);

  const finishDismiss = useCallback(() => {
    if (!canDismissRef.current) {
      return;
    }
    canDismissRef.current = false;
    onDismiss();
  }, [onDismiss]);

  // A tap anywhere, VoiceOver's escape, Android back or the host's `close()`: the content fades out
  // over the white, then the host closes. An animation cut short by another reports
  // `finished: false`, and closes nothing.
  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) {
        scheduleOnRN(finishDismiss);
      }
    });
  }, [finishDismiss, opacity]);

  // A swipe down that closes: the content slides away by the window's height, then the host closes.
  const handleSwipeClose = useCallback(() => {
    isClosingRef.current = true;
    translateY.value = withTiming(windowHeight, { duration: SLIDE_OUT_MS }, (finished) => {
      if (finished) {
        scheduleOnRN(finishDismiss);
      }
    });
  }, [finishDismiss, translateY, windowHeight]);

  useImperativeHandle(ref, () => ({ close: handleClose }), [handleClose]);

  // Android back. On the route this listener runs before expo-router's, which pops the screen — the
  // last listener registered runs first — and it takes the press, so the content leaves before the
  // screen does. In card detail's `Modal` the dialog takes the press instead, and its host closes
  // the view through `close()`. A press during the exit is taken too, so the route pops once. Only
  // while the view's screen is focused: under a screen pushed over it — a second link — the press
  // is that screen's, and is left to expo-router.
  const isFocused = useIsFocused();
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFocused) {
        return false;
      }
      handleClose();
      return true;
    });
    return () => {
      subscription.remove();
    };
  }, [handleClose, isFocused]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          // The content follows a drag down, and never rises above where it rests.
          translateY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (shouldSwipeClose(event.translationY, event.velocityY)) {
            scheduleOnRN(handleSwipeClose);
          } else {
            translateY.value = withTiming(0, { duration: SETTLE_BACK_MS });
          }
        }),
    [handleSwipeClose, translateY]
  );

  const contentMotion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(card.barcode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // The failure only: the value is never logged (Story 16.23).
      logger.warn('Failed to copy barcode:', error);
    }
  }, [card.barcode]);

  const boxWidth = getBarcodeBoxWidth(windowWidth);
  const boxHeight = card.barcodeFormat === 'QR' ? boxWidth : LINEAR_BOX_HEIGHT;

  return (
    <GestureHandlerRootView style={styles.ground}>
      <StatusBar style="dark" />
      <GestureDetector gesture={swipe}>
        <Animated.View
          style={[styles.fill, contentMotion]}
          onAccessibilityEscape={handleClose}
          testID="barcode-flash"
        >
          {/* The whole screen is the close target, BEHIND the content rather than around it: to
              VoiceOver a button is one element, and one wrapped round the content would hide the
              name, the code and the number inside it. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t('cards.flash.dismissOverlayA11yLabel')}
            accessibilityHint={t('cards.flash.dismissOverlayA11yHint')}
            testID="barcode-flash-close"
          />
          <View
            pointerEvents="box-none"
            style={[styles.body, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            testID="barcode-flash-body"
          >
            {/* A tap on the stack closes too. It is a touch target only: to assistive technology
                it is no element at all, so each thing in it is read on its own. */}
            <Pressable
              onPress={handleClose}
              accessible={false}
              importantForAccessibility="no"
              style={styles.stack}
              testID="barcode-flash-stack"
            >
              <Text
                accessibilityRole="header"
                numberOfLines={2}
                style={styles.name}
                testID="barcode-flash-name"
              >
                {card.name}
              </Text>

              {/* The code's box, bare: no plate, border, radius or shadow, and nothing over it. An
                  element with no label of its own, so a screen reader reads the renderer's. The
                  renderer's own white padding overhangs the box either side, white on white. */}
              <View
                accessible
                accessibilityRole="image"
                style={[styles.box, { width: boxWidth, height: boxHeight }]}
                testID="barcode-flash-code"
              >
                <BarcodeRenderer
                  value={card.barcode}
                  format={card.barcodeFormat}
                  width={boxWidth}
                  height={boxHeight}
                  color={BARCODE_FLASH.foreground}
                  backgroundColor={BARCODE_FLASH.background}
                  fillBox
                />
              </View>

              {/* The number exactly as stored, never grouped. A tap on it closes, as a tap
                  anywhere does; a long press copies it. */}
              <Pressable
                onPress={handleClose}
                onLongPress={handleCopy}
                accessibilityRole="text"
                accessibilityLabel={t('cards.flash.barcodeValueA11yLabel', {
                  title: card.name,
                  value: card.barcode
                })}
                accessibilityHint={t('cards.flash.copyHint')}
                style={styles.numberTarget}
                testID="barcode-flash-number"
              >
                <Text numberOfLines={3} style={styles.number}>
                  {card.barcode}
                </Text>
              </Pressable>

              {/* For touch only. A screen reader has the close button, which carries the same
                  words as its hint, and the escape gesture. */}
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.hint}
                testID="barcode-flash-hint"
              >
                {t('cards.flash.tapToClose')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  // White edge to edge, both insets included, whatever the scheme. It never fades or moves, so
  // nothing but white shows behind the content as it fades in, fades out or slides away.
  ground: {
    flex: 1,
    backgroundColor: BARCODE_FLASH.background
  },
  fill: {
    flex: 1
  },
  // Between the insets, on the 24pt screen margins, as the frames' body.
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  // Centred by its auto margins while it fits. At the largest text sizes, where it cannot, they
  // collapse to nothing and the group starts at the top inset instead of spilling over both: the
  // name never runs into the clock, and the code — under two lines of name at most — stays whole
  // and unshrunk on screen. Below the code, the number and the hint can run off the bottom of a
  // small phone.
  stack: {
    alignItems: 'center',
    marginVertical: 'auto'
  },
  name: {
    ...TYPOGRAPHY.headlineSm,
    color: LIGHT_THEME_COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: NAME_GAP
  },
  box: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  numberTarget: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: TOUCH_TARGET.min,
    minHeight: TOUCH_TARGET.min,
    marginTop: NUMBER_GAP - NUMBER_TARGET_PADDING,
    paddingVertical: NUMBER_TARGET_PADDING
  },
  // `monoCode` as the design system has it, without the frames' extra 1px of tracking.
  number: {
    ...TYPOGRAPHY.monoCode,
    color: LIGHT_THEME_COLORS.textPrimary,
    textAlign: 'center'
  },
  hint: {
    ...TYPOGRAPHY.captionLg,
    color: LIGHT_THEME_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: HINT_GAP - NUMBER_TARGET_PADDING
  }
});
