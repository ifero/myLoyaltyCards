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
  children: React.ReactNode;
  testID?: string;
};

const getVariantColors = (variant: ButtonVariant, theme: ReturnType<typeof useTheme>['theme']) => {
  if (variant === 'primary') {
    return {
      backgroundColor: theme.primary,
      pressedColor: theme.primaryDark,
      borderColor: theme.primary,
      textColor: '#FFFFFF',
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: 'transparent',
      pressedColor: theme.primary + '14',
      borderColor: theme.primary,
      textColor: theme.primary,
    };
  }

  if (variant === 'tertiary') {
    return {
      backgroundColor: 'transparent',
      pressedColor: theme.primary + '14',
      borderColor: 'transparent',
      textColor: theme.primary,
    };
  }

  return {
    backgroundColor: theme.error,
    pressedColor: '#B91C1C',
    borderColor: theme.error,
    textColor: '#FFFFFF',
  };
};

export const Button = ({
  variant,
  onPress,
  loading = false,
  disabled = false,
  children,
  testID,
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
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={styles.pressable}
    >
      <View
        style={[
          styles.container,
          {
            borderWidth: variant === 'tertiary' ? 0 : 1,
            borderColor: colors.borderColor,
            backgroundColor: bgColor,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator testID={`${testID}-spinner`} color={colors.textColor} />
        ) : (
          <Text
            style={{
              color: isDisabled ? theme.textTertiary : colors.textColor,
              fontSize: 16,
              fontWeight: '600',
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
    width: '100%',
  },
  container: {
    minHeight: TOUCH_TARGET.min,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
