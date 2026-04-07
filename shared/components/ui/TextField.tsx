import React, { useMemo, useState } from 'react';
import {
  ReturnKeyTypeOptions,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle
} from 'react-native';

import { useTheme } from '@/shared/theme';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  hasError?: boolean;
  disabled?: boolean;
  testID?: string;
  secureTextEntry?: boolean;
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  rightAdornment?: React.ReactNode;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hasError = false,
  disabled = false,
  testID,
  secureTextEntry = false,
  onBlur,
  onFocus,
  keyboardType,
  autoCapitalize,
  autoComplete,
  autoCorrect,
  accessibilityLabel,
  accessibilityHint,
  rightAdornment,
  returnKeyType,
  onSubmitEditing,
  containerStyle
}: TextFieldProps) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const state = useMemo(() => {
    if (disabled) return 'disabled';
    if (error || hasError) return 'error';
    if (focused) return 'focused';
    if (value.length > 0) return 'filled';
    return 'default';
  }, [disabled, error, focused, hasError, value.length]);

  const borderColor =
    state === 'error' ? theme.error : state === 'focused' ? theme.primary : theme.border;

  const hasAdornment = Boolean(rightAdornment);

  return (
    <View className="w-full" style={containerStyle}>
      <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          accessibilityState={{ disabled }}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={{
            minHeight: TOUCH_TARGET.min,
            borderRadius: 12,
            borderWidth: 1,
            borderColor,
            backgroundColor: disabled ? theme.backgroundSubtle : theme.surfaceElevated,
            color: theme.textPrimary,
            paddingHorizontal: 12,
            paddingRight: hasAdornment ? 52 : 12,
            fontSize: 16
          }}
        />
        {hasAdornment ? (
          <View style={{ position: 'absolute', right: 8, alignSelf: 'center' }}>
            {rightAdornment}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text
          testID={`${testID}-error`}
          accessibilityLiveRegion="polite"
          style={{ color: theme.error, fontSize: 12, marginTop: 4 }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
};
