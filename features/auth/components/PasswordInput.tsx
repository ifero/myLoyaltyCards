import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable } from 'react-native';

import { TextField } from '@/shared/components/ui';
import { useTheme } from '@/shared/theme';

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  hasError?: boolean;
  testID: string;
  accessibilityHint?: string;
  onBlur?: () => void;
  autoComplete?: 'password' | 'new-password' | 'current-password';
};

export const PasswordInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hasError = false,
  testID,
  accessibilityHint,
  onBlur,
  autoComplete = 'password'
}: PasswordInputProps) => {
  const { theme, touchTarget } = useTheme();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      hasError={hasError}
      secureTextEntry={!isVisible}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      testID={testID}
      onBlur={onBlur}
      rightAdornment={
        <Pressable
          testID={`${testID}-toggle`}
          onPress={() => setIsVisible((previous) => !previous)}
          accessibilityRole="button"
          accessibilityLabel={isVisible ? 'Hide password' : 'Show password'}
          style={{
            minWidth: touchTarget.min,
            minHeight: touchTarget.min,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialIcons
            name={isVisible ? 'visibility-off' : 'visibility'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      }
    />
  );
};
