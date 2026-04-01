import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

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
      borderColor: theme.primary,
      textColor: '#FFFFFF'
    };
  }

  if (variant === 'secondary') {
    return {
      backgroundColor: 'transparent',
      borderColor: theme.primary,
      textColor: theme.primary
    };
  }

  if (variant === 'tertiary') {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.primary
    };
  }

  return {
    backgroundColor: theme.error,
    borderColor: theme.error,
    textColor: '#FFFFFF'
  };
};

export const Button = ({
  variant,
  onPress,
  loading = false,
  disabled = false,
  children,
  testID
}: ButtonProps) => {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;
  const colors = getVariantColors(variant, theme);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => ({
        minHeight: TOUCH_TARGET.min,
        borderRadius: 14,
        borderWidth: variant === 'tertiary' ? 0 : 1,
        borderColor: colors.borderColor,
        backgroundColor: isDisabled
          ? theme.border
          : pressed
            ? theme.primaryDark
            : colors.backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16
      })}
      className="w-full"
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
    </Pressable>
  );
};
