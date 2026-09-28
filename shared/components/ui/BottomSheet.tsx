import React from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/shared/theme';
import { IDENTITY_COLORS, toRgbChannels } from '@/shared/theme/colors';
import { LAYOUT } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

/**
 * The sheet's motion, settled in Story 22.1 (AC8): the scrim FADES and only the sheet SLIDES, both
 * on the UI thread. A native Modal animation cannot do that, because it animates the whole modal:
 * `slide` (the shared sheet's) carried the dark scrim up the screen with the sheet like a curtain,
 * and `fade` (the multi-code picker's) faded the sheet too, so the rows behind it showed through
 * while it rose. So the Modal presents with no animation of its own. `withTiming` defaults to
 * `ReduceMotion.System`, so under Reduce Motion the sheet simply appears.
 */
export const SHEET_SLIDE_MS = 220;

/**
 * How far below its resting place the sheet sits, in % of its OWN height: 0 when shown, 100 (just
 * out of view) when not. The picker travelled a whole window height instead, so a short sheet was
 * off the screen for most of the 220 ms and seemed to blink out rather than slide.
 */
export const getSheetOffset = (visible: boolean): number => (visible ? 0 : 100);

/**
 * The slide as a style. A percentage `translate` resolves against the view's own size (React
 * Native 0.75+, New Architecture), so the sheet never has to be measured. A worklet, tested on
 * its own, because the Reanimated mock returns `{}` for animated styles.
 */
export const getSlideStyle = (offset: number): { transform: [{ translateY: `${number}%` }] } => {
  'worklet';
  return { transform: [{ translateY: `${offset}%` }] };
};

/** How much of the scrim shows: all of it when the sheet is shown, none when it is not. */
export const getScrimOpacity = (visible: boolean): number => (visible ? 1 : 0);

/** Ink at 40 % — the settings frames' scrim — split so it stays tied to the token. */
const SCRIM_COLOR = `rgba(${toRgbChannels(IDENTITY_COLORS.ink)}, 0.4)`;

/** The design system's grabber, from `stitch-prompts-settings.txt`: 36 × 4, fully rounded. */
const GRABBER_WIDTH = 36;
const GRABBER_HEIGHT = 4;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * The sheet (`cardi-design-system.md` § _Sheets_): anchored to the bottom edge, full width, white
 * (ink in dark) with a 16px radius on its TOP corners only, over a 40 % ink scrim. A 36 × 4 grabber
 * sits 8px from the top, then 24px margins hold a `sheetTitle` title, an optional description 8px
 * below it, and the content. It never grows taller than 80 % of the window: a long list inside
 * scrolls instead of pushing the title off the screen.
 *
 * The scrim and the sheet are SIBLINGS. The scrim is a touch affordance only — hidden from
 * assistive technology, which gets the platform dismiss instead (Android back via
 * `onRequestClose`, the VoiceOver escape gesture) — and the sheet is a modal container, not an
 * accessibility element, so every control inside it stays reachable.
 */
export const BottomSheet = ({
  visible,
  onClose,
  title,
  description,
  children,
  testID,
  accessibilityLabel
}: BottomSheetProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const previousVisibleRef = React.useRef<boolean | null>(null);
  const offset = useSharedValue(getSheetOffset(false));
  const scrimOpacity = useSharedValue(getScrimOpacity(false));

  // The Modal outlives `visible` by the slide-out, so a closing sheet leaves on screen instead of
  // vanishing. It opens in the same render as `visible`, and closes when the slide has finished.
  const [isPresented, setIsPresented] = React.useState(visible);
  if (visible && !isPresented) {
    setIsPresented(true);
  }

  React.useEffect(() => {
    const timing = { duration: SHEET_SLIDE_MS, easing: Easing.out(Easing.ease) };
    scrimOpacity.value = withTiming(getScrimOpacity(visible), timing);
    offset.value = withTiming(getSheetOffset(visible), timing, (finished) => {
      // `finished` is false when a re-open cut this slide-out short. Its callback can still land
      // after the NEXT close has begun, and must not take that one's modal down with it.
      if (finished && !visible) {
        scheduleOnRN(setIsPresented, false);
      }
    });
  }, [offset, scrimOpacity, visible]);

  const slideStyle = useAnimatedStyle(() => getSlideStyle(offset.value));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));

  React.useEffect(() => {
    const label = accessibilityLabel ?? title ?? t('sharedUi.bottomSheet.fallbackLabel');
    const previousVisible = previousVisibleRef.current;

    if (previousVisible === null) {
      previousVisibleRef.current = visible;
      if (visible) {
        AccessibilityInfo.announceForAccessibility?.(
          t('sharedUi.bottomSheet.openedAnnouncement', { label })
        );
      }
      return;
    }

    if (previousVisible !== visible) {
      AccessibilityInfo.announceForAccessibility?.(
        visible
          ? t('sharedUi.bottomSheet.openedAnnouncement', { label })
          : t('sharedUi.bottomSheet.closedAnnouncement', { label })
      );
      previousVisibleRef.current = visible;
    }
  }, [accessibilityLabel, t, title, visible]);

  return (
    <Modal
      visible={isPresented}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
      accessibilityElementsHidden={!visible}
    >
      <View
        testID={testID ? `${testID}-root` : undefined}
        style={[styles.root, visible ? null : styles.leaving]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
          <Pressable
            testID={testID ? `${testID}-scrim` : undefined}
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={onClose}
            accessible={false}
            importantForAccessibility="no"
            accessibilityElementsHidden
          />
        </Animated.View>
        <Animated.View
          testID={testID ? `${testID}-content` : undefined}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              paddingBottom: Math.max(20, insets.bottom + 8)
            },
            slideStyle
          ]}
        >
          <View
            testID={testID ? `${testID}-grabber` : undefined}
            style={[styles.grabber, { backgroundColor: theme.border }]}
          />
          <View style={styles.body}>
            {title ? (
              <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text style={[styles.description, { color: theme.textSecondary }]}>
                {description}
              </Text>
            ) : null}
            <View style={[styles.content, title || description ? styles.contentBelowText : null]}>
              {children}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  // A sheet on its way out takes no more touches, so none of its actions can fire a second time.
  leaving: {
    pointerEvents: 'none'
  },
  scrim: {
    backgroundColor: SCRIM_COLOR
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: LAYOUT.screenHorizontalMargin
  },
  grabber: {
    alignSelf: 'center',
    width: GRABBER_WIDTH,
    height: GRABBER_HEIGHT,
    borderRadius: GRABBER_HEIGHT / 2,
    marginTop: 8
  },
  body: {
    flexShrink: 1,
    paddingTop: 16
  },
  title: {
    ...TYPOGRAPHY.sheetTitle
  },
  description: {
    ...TYPOGRAPHY.bodyMd,
    marginTop: 8
  },
  // Shrinks so a scrolling child (a list) stays inside the 80 % cap instead of overflowing it.
  content: {
    flexShrink: 1
  },
  contentBelowText: {
    marginTop: 16
  }
});
