import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useTheme } from '@/shared/theme';

export type PasswordStrength = 'weak' | 'fair' | 'strong';

const hasSpecialCharacter = (value: string) => /[^a-zA-Z0-9]/.test(value);
const hasNumber = (value: string) => /\d/.test(value);
const hasLetter = (value: string) => /[a-zA-Z]/.test(value);

export const getPasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 8 || !hasLetter(password) || !hasNumber(password)) {
    return 'weak';
  }

  if (password.length >= 12 && hasSpecialCharacter(password)) {
    return 'strong';
  }

  return 'fair';
};

type PasswordStrengthIndicatorProps = {
  password: string;
  testID?: string;
};

export const PasswordStrengthIndicator = ({
  password,
  testID = 'password-strength-indicator'
}: PasswordStrengthIndicatorProps) => {
  if (!password.trim()) {
    return null;
  }

  const { theme, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const strength = getPasswordStrength(password);

  const width = strength === 'weak' ? '33%' : strength === 'fair' ? '66%' : '100%';
  const color =
    strength === 'weak' ? theme.error : strength === 'fair' ? theme.warning : theme.success;

  const label =
    strength === 'weak'
      ? t('auth.passwordStrength.weak')
      : strength === 'fair'
        ? t('auth.passwordStrength.fair')
        : t('auth.passwordStrength.strong');

  return (
    <View
      testID={testID}
      style={[styles.container, { marginTop: spacing.sm, marginBottom: spacing.md }]}
    >
      <View
        testID={`${testID}-track`}
        style={{
          flex: 1,
          height: 6,
          borderRadius: 999,
          backgroundColor: theme.border,
          overflow: 'hidden'
        }}
      >
        <View
          testID={`${testID}-bar`}
          style={{ width, height: '100%', borderRadius: 999, backgroundColor: color }}
        />
      </View>
      <Text
        testID={`${testID}-label`}
        style={{
          marginLeft: spacing.sm,
          color,
          fontSize: typography.caption1.fontSize,
          lineHeight: typography.caption1.lineHeight,
          fontWeight: '600'
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  }
});
