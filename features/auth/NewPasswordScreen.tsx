import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isValidPassword } from '@/core/auth/validation';

import { Button } from '@/shared/components/ui';
import { updatePassword } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';
import { showToast } from '@/shared/toast';

import {
  AuthScreenLayout,
  ErrorBanner,
  PasswordInput,
  PasswordStrengthIndicator
} from './components';
import { getSingleParam } from './routeParams';

/**
 * Shared "set a new password" screen (Story 6.19; reused by Story 6.20).
 *
 * Assumes an authenticated session is already active — for recovery that is the
 * session returned by `verifyPasswordResetOtp`. It only validates the new
 * password and calls `updatePassword`; there is no deep-link/token handling
 * (that dead flow was removed with the old ResetPasswordScreen).
 *
 * Where a successful update navigates is driven by the `origin` route param so
 * the single `/new-password` route serves both flows without a wrapper (the
 * route file is a pure re-export). Recovery (6.19) lands on `/`; the Settings
 * change-password flow (6.20, `origin: 'change-password'`) confirms with a toast
 * and returns to the preserved `/settings` screen via `dismissTo`.
 */
const NewPasswordScreen = () => {
  const { theme, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ origin?: string | string[] }>();
  const origin = getSingleParam(params.origin);
  const isSettingsChangePassword = origin === 'change-password';

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

      if (isSettingsChangePassword) {
        // Story 6.20: confirm the change and return to the Settings screen that
        // launched the flow. The OTP screen preserved the back stack for this
        // origin, so dismissTo lands on the live /settings without duplicating it.
        await showToast({ title: t('settings.account.passwordChanged'), preset: 'done' });
        router.dismissTo('/settings');
        return;
      }

      router.replace('/');
    } catch {
      setError(t('auth.newPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [isSettingsChangePassword, mapUpdateError, password, router, t, validate]);

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
