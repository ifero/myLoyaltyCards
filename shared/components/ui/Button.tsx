import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';

type ButtonProps = {
  variant: ButtonVariant;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'default' | 'large';
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

const getVariantColors = (variant: ButtonVariant, theme: ReturnType<typeof useTheme>['theme']) => {
  if (variant === 'primary') {
    return {
      backgroundColor: theme.primary,
      pressedColor: theme.primaryDark,
      borderColor: theme.primary,
      // NOT a hardcoded white. The primary fill is ink in light and BEAM in
      // dark, and white on beam is 1.52:1 — a straight WCAG failure that reads as
      // "bright" in a screenshot and is unreadable in daylight. `onPrimary` is the
      // token that follows the fill (white on ink, ink on beam);
      // `colors.contrast.test.ts` asserts both pairings and asserts the white one
      // failing, on purpose.
      textColor: theme.onPrimary
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: 'transparent',
      pressedColor: theme.primary + '14',
      borderColor: theme.primary,
      textColor: theme.primary
    };
  }

  if (variant === 'tertiary') {
    return {
      backgroundColor: 'transparent',
      pressedColor: theme.primary + '14',
      borderColor: 'transparent',
      textColor: theme.primary
    };
  }

  return {
    backgroundColor: theme.error,
    pressedColor: theme.error,
    borderColor: theme.error,
    // The same trap as `primary`, one token along: the dark error red is lifted
    // far enough to clear AA against black, which is exactly what stops white
    // clearing AA against IT (3.41:1). `onError` follows the fill.
    textColor: theme.onError
  };
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
  const isDisabled = disabled || loading;
  const colors = getVariantColors(variant, theme);

  const bgColor = isDisabled
    ? theme.border
    : pressed
      ? colors.pressedColor
      : colors.backgroundColor;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={styles.pressable}
    >
      <View
        style={[
          styles.container,
          size === 'large' ? styles.large : null,
          {
            borderWidth: variant === 'tertiary' ? 0 : 1,
            borderColor: colors.borderColor,
            backgroundColor: bgColor
          }
        ]}
      >
        {loading ? (
          <ActivityIndicator testID={`${testID}-spinner`} color={colors.textColor} />
        ) : (
          <Text
            style={{
              color: isDisabled ? theme.textTertiary : colors.textColor,
              fontSize: 16,
              fontWeight: '600'
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  large: {
    minHeight: 52
  }
});
