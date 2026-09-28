import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY } from '@/shared/theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type ButtonTheme = ReturnType<typeof useTheme>['theme'];

type ButtonProps = {
  variant: ButtonVariant;
  onPress?: () => void;
  /**
   * Busy: keeps the variant's fill, swaps the label for a spinner, ignores presses, and is
   * announced as busy — never drawn or announced as disabled (`cardi-design-system.md`
   * § _The primary-action footer_, "Busy is not disabled"). Wins over `disabled`.
   */
  loading?: boolean;
  /**
   * A genuinely unavailable action. A primary action is ALWAYS enabled — pressing it on an
   * incomplete form reveals the field errors — so this is for the rare gate the system sanctions:
   * the type-to-confirm delete, drawn as the destructive label at 40 %.
   */
  disabled?: boolean;
  /** `large` is the 52pt primary action in a footer; `default` is the touch-target height. */
  size?: 'default' | 'large';
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

type VariantColors = {
  backgroundColor: string;
  pressedColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
};

/** A press on a transparent button: an 8 % wash of its own label colour. */
const PRESSED_WASH = '14';

/** The one disabled rendering the system draws: the type-to-confirm gate's red label at 40 %. */
const DISABLED_DESTRUCTIVE_OPACITY = 0.4;

/**
 * Fill, border, label and pressed colour per variant. Exhaustive by construction: a variant added
 * to the union without a branch here fails the build at the `never` below, where it used to fall
 * through to whatever the last `return` drew (Story 16.32).
 */
export const getVariantColors = (variant: ButtonVariant, theme: ButtonTheme): VariantColors => {
  switch (variant) {
    case 'primary':
      return {
        backgroundColor: theme.primary,
        pressedColor: theme.primaryDark,
        borderColor: theme.primary,
        borderWidth: 1,
        // NOT a hardcoded white. The primary fill is ink in light and BEAM in dark, and white on
        // beam is 1.52:1 — a straight WCAG failure that reads as "bright" in a screenshot and is
        // unreadable in daylight. `onPrimary` is the token that follows the fill (white on ink,
        // ink on beam); `colors.contrast.test.ts` asserts both pairings and asserts the white one
        // failing, on purpose.
        textColor: theme.onPrimary
      };
    case 'secondary':
      return {
        backgroundColor: 'transparent',
        pressedColor: theme.primary + PRESSED_WASH,
        borderColor: theme.primary,
        borderWidth: 1,
        textColor: theme.primary
      };
    case 'tertiary':
      return {
        backgroundColor: 'transparent',
        pressedColor: theme.primary + PRESSED_WASH,
        borderColor: 'transparent',
        borderWidth: 0,
        textColor: theme.primary
      };
    case 'destructive':
      // Borderless red TEXT — no fill, no border, no icon (`cardi-design-system.md` § Buttons).
      // It was a solid `theme.error` slab with a white label, a border, and a pressed colour
      // equal to its fill: the most dangerous button in the app was the only one that did not
      // acknowledge a touch.
      return {
        backgroundColor: 'transparent',
        pressedColor: theme.error + PRESSED_WASH,
        borderColor: 'transparent',
        borderWidth: 0,
        textColor: theme.error
      };
    default: {
      const unhandled: never = variant;
      throw new Error(`Unhandled Button variant: ${String(unhandled)}`);
    }
  }
};

export const Button = ({
  variant,
  onPress,
  loading = false,
  disabled = false,
  size = 'default',
  children,
  testID,
  accessibilityLabel,
  accessibilityHint
}: ButtonProps) => {
  const { theme } = useTheme();
  const [pressed, setPressed] = useState(false);
  const colors = getVariantColors(variant, theme);

  // Busy wins over disabled: a submitting button says "working", not "no".
  const isDisabled = disabled && !loading;
  const isInert = loading || disabled;
  const greyedOut = isDisabled && variant !== 'destructive';

  const backgroundColor = greyedOut
    ? theme.border
    : pressed && !isInert
      ? colors.pressedColor
      : colors.backgroundColor;

  // Presses are refused while busy inside the handlers, NOT through `disabled`, which would also
  // stamp `accessibilityState.disabled` and announce a busy button as dimmed.
  const handlePress = () => {
    if (!isInert) onPress?.();
  };

  const handlePressIn = () => {
    if (!isInert) setPressed(true);
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={styles.pressable}
    >
      <View
        testID={testID ? `${testID}-container` : undefined}
        style={[
          styles.container,
          size === 'large' ? styles.large : null,
          {
            borderWidth: colors.borderWidth,
            borderColor: colors.borderColor,
            backgroundColor
          },
          isDisabled && variant === 'destructive' ? styles.disabledDestructive : null
        ]}
      >
        {loading ? (
          <ActivityIndicator testID={`${testID}-spinner`} color={colors.textColor} />
        ) : (
          <Text
            style={{
              ...TYPOGRAPHY.bodyLgStrong,
              color: greyedOut ? theme.textTertiary : colors.textColor
            }}
          >
            {children}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%'
  },
  container: {
    minHeight: TOUCH_TARGET.min,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  large: {
    minHeight: 52
  },
  disabledDestructive: {
    opacity: DISABLED_DESTRUCTIVE_OPACITY
  }
});
