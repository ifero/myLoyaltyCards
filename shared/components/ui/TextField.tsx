import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  testID?: string;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  testID
}: TextFieldProps) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const state = useMemo(() => {
    if (disabled) return 'disabled';
    if (error) return 'error';
    if (focused) return 'focused';
    if (value.length > 0) return 'filled';
    return 'default';
  }, [disabled, error, focused, value.length]);

  const borderColor =
    state === 'error' ? theme.error : state === 'focused' ? theme.primary : theme.border;

  return (
    <View className="w-full">
      <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        editable={!disabled}
        accessibilityState={{ disabled }}
        style={{
          minHeight: TOUCH_TARGET.min,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          backgroundColor: disabled ? theme.backgroundSubtle : theme.surface,
          color: theme.textPrimary,
          paddingHorizontal: 12,
          fontSize: 16
        }}
      />
      {error ? (
        <Text testID={`${testID}-error`} style={{ color: theme.error, fontSize: 12, marginTop: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};
