import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  disabled?: boolean;
  label?: string;
  testID?: string;
};

export const ToggleSwitch = ({
  value,
  onValueChange,
  disabled = false,
  label,
  testID
}: ToggleSwitchProps) => {
  const { theme } = useTheme();

  return (
    <Pressable
      testID={testID}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{
        minHeight: TOUCH_TARGET.min,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        opacity: disabled ? 0.6 : 1
      }}
    >
      {label ? <Text style={{ color: theme.textPrimary, fontSize: 16 }}>{label}</Text> : null}
      <View
        style={{
          width: 52,
          height: 32,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: value ? theme.primary : theme.borderStrong,
          backgroundColor: value ? `${theme.primary}33` : theme.surfaceElevated,
          justifyContent: 'center',
          paddingHorizontal: 2
        }}
      >
        <View
          testID={`${testID}-knob`}
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            backgroundColor: value ? theme.primary : theme.textTertiary,
            transform: [{ translateX: value ? 22 : 0 }]
          }}
        />
      </View>
    </Pressable>
  );
};
