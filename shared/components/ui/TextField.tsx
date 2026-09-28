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

import { TOUCH_TARGET } from '@/shared/theme/spacing';
import { TYPOGRAPHY, inputFont } from '@/shared/theme/typography';

type TextFieldProps = {
  /** Sentence case — the label idiom uppercases it by style (see `FieldLabel`). */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** React 19 passes `ref` as a prop: it reaches the input, so a form library can focus it. */
  ref?: React.Ref<TextInput>;
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
  maxLength?: number;
  /** Shows `length/maxLength` at the end of the label row. Has no effect without `maxLength`. */
  showCharacterCount?: boolean;
  /** Card numbers: JetBrains Mono (`monoCode`), so the digits align while someone reads them. */
  mono?: boolean;
};

type FieldTextProps = {
  children: string;
  testID?: string;
};

/**
 * The form label (`cardi-design-system.md` § _Typography_): `label-bold` in UPPERCASE, ink,
 * always above its field. The capitals are `textTransform`, never the string, so assistive
 * technology reads the words. Exported for fields that are not text inputs — the colour picker,
 * a read-only value — so every field in a form carries the same label.
 */
export const FieldLabel = ({ children, testID }: FieldTextProps) => (
  <Text testID={testID} style={styles.label}>
    {children}
  </Text>
);

/** A field's validation message: `captionMd` in the error colour, announced when it appears. */
export const FieldError = ({ children, testID }: FieldTextProps) => (
  <Text testID={testID} accessibilityLiveRegion="polite" style={styles.error}>
    {children}
  </Text>
);

export const TextField = ({
  label,
  value,
  onChangeText,
  ref,
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
  containerStyle,
  maxLength,
  showCharacterCount = false,
  mono = false
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
  const showCount = showCharacterCount && maxLength !== undefined;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <FieldLabel>{label}</FieldLabel>
        {showCount ? (
          <Text style={styles.count}>
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
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
          maxLength={maxLength}
          style={[
            styles.input,
            mono ? styles.inputMono : null,
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
      {error ? <FieldError testID={`${testID}-error`}>{error}</FieldError> : null}
    </View>
  );
};

const styles = StyleSheet.create((theme) => ({
  container: {
    width: '100%'
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  label: {
    ...TYPOGRAPHY.labelBold,
    color: theme.colors.textPrimary,
    textTransform: 'uppercase'
  },
  count: {
    ...TYPOGRAPHY.captionMd,
    color: theme.colors.textTertiary
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center'
  },
  input: {
    // The token itself, as `Button` reads it, so a test can feed an odd one.
    minHeight: TOUCH_TARGET.min,
    borderRadius: 12,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    ...inputFont(TYPOGRAPHY.bodyLg)
  },
  inputMono: {
    ...inputFont(TYPOGRAPHY.monoCode)
  },
  adornment: {
    position: 'absolute',
    right: 8,
    alignSelf: 'center'
  },
  error: {
    ...TYPOGRAPHY.captionMd,
    color: theme.colors.error,
    marginTop: 4
  }
}));
