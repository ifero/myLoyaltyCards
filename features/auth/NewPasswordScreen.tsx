import { type Href, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isValidPassword } from '@/core/auth/validation';

import { Button } from '@/shared/components/ui';
import { updatePassword } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import {
  AuthScreenLayout,
  ErrorBanner,
  PasswordInput,
  PasswordStrengthIndicator
} from './components';

/**
 * Shared "set a new password" screen (Story 6.19; reused by Story 6.20).
 *
 * Assumes an authenticated session is already active — for recovery that is the
 * session returned by `verifyPasswordResetOtp`. It only validates the new
 * password and calls `updatePassword`; there is no deep-link/token handling
 * (that dead flow was removed with the old ResetPasswordScreen).
 *
 * `successHref` is where a successful update navigates. It defaults to `/`
 * (the recovery flow), and a caller (e.g. the Settings change-password flow in
 * 6.20) can wrap this screen to point elsewhere.
 */
const NewPasswordScreen = ({ successHref = '/' }: { successHref?: Href }) => {
  const { theme, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const mapUpdateError = useCallback(
    (message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? '';

      if (
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('request failed')
      ) {
        return t('auth.newPassword.networkError');
      }

      return t('auth.newPassword.genericError');
    },
    [t]
  );

  const validate = useCallback(() => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = t('auth.validation.passwordRequired');
    } else if (!isValidPassword(password)) {
      errors.password = t('auth.validation.passwordRule');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('auth.validation.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsMismatch');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [confirmPassword, password, t]);

  const handleUpdatePassword = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setError(mapUpdateError(result.error.message));
        return;
      }

      router.replace(successHref);
    } catch {
      setError(t('auth.newPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [mapUpdateError, password, router, successHref, t, validate]);

  return (
    <AuthScreenLayout
      testID="new-password-screen"
      heading={t('auth.newPassword.heading')}
      headingTestID="new-password-title"
      subtitle={t('auth.newPassword.subtitle')}
      subtitleTestID="new-password-subtitle"
    >
      <View style={[styles.formGroup, { gap: spacing.md }]}>
        <ErrorBanner message={error} testID="server-error" />

        <View>
          <PasswordInput
            testID="password-input"
            label={t('auth.fields.newPassword')}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) {
                setFieldErrors((previous) => ({ ...previous, password: undefined }));
              }
            }}
            placeholder={t('auth.placeholders.newPassword')}
            autoComplete="new-password"
            accessibilityHint={t('auth.accessibility.passwordRuleHint')}
            error={fieldErrors.password}
          />
          <PasswordStrengthIndicator password={password} />
        </View>

        <PasswordInput
          testID="confirm-password-input"
          label={t('auth.fields.confirmPassword')}
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((previous) => ({ ...previous, confirmPassword: undefined }));
            }
          }}
          placeholder={t('auth.placeholders.confirmNewPassword')}
          autoComplete="new-password"
          accessibilityHint={t('auth.accessibility.confirmNewPasswordHint')}
          error={fieldErrors.confirmPassword}
        />

        <Text
          testID="password-requirements"
          style={{
            color: theme.textSecondary,
            fontSize: typography.caption1.fontSize,
            lineHeight: typography.caption1.lineHeight
          }}
        >
          {t('auth.createAccount.passwordRequirements')}
        </Text>

        <Button
          testID="update-password-button"
          variant="primary"
          size="large"
          onPress={handleUpdatePassword}
          loading={loading}
          accessibilityLabel={t('auth.newPassword.button')}
        >
          {t('auth.newPassword.button')}
        </Button>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  formGroup: {
    width: '100%'
  }
});

export default NewPasswordScreen;
