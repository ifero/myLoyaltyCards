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
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
  const { theme } = useUnistyles();
  const [focused, setFocused] = useState(false);

  const state = useMemo(() => {
    if (disabled) return 'disabled';
    if (error || hasError) return 'error';
    if (focused) return 'focused';
    if (value.length > 0) return 'filled';
    return 'default';
  }, [disabled, error, focused, hasError, value.length]);

  const borderColor =
    state === 'error'
      ? theme.colors.error
      : state === 'focused'
        ? theme.colors.primary
        : theme.colors.border;

  const hasAdornment = Boolean(rightAdornment);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
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
          placeholderTextColor={theme.colors.textTertiary}
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
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor: disabled
                ? theme.colors.backgroundSubtle
                : theme.colors.surfaceElevated,
              paddingRight: hasAdornment ? 52 : 12
            }
          ]}
        />
        {hasAdornment ? <View style={styles.adornment}>{rightAdornment}</View> : null}
      </View>
      {error ? (
        <Text testID={`${testID}-error`} accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    width: '100%'
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center'
  },
  input: {
    minHeight: theme.touchTarget.min,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    fontSize: 16
  },
  adornment: {
    position: 'absolute',
    right: 8,
    alignSelf: 'center'
  },
  error: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4
  }
}));
