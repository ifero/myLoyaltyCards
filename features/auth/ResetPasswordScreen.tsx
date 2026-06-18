import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isValidPassword } from '@/core/auth/validation';
import { getInitialURL } from '@/core/utils/get-initial-url';

import { Button } from '@/shared/components/ui';
import { updatePassword } from '@/shared/supabase/auth';
import { getSupabaseClient } from '@/shared/supabase/client';
import { useTheme } from '@/shared/theme';

import {
  AuthScreenLayout,
  ErrorBanner,
  PasswordInput,
  PasswordStrengthIndicator
} from './components';

const parseHashFragment = (url: string): Record<string, string> => {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return {};
  }

  const hash = url.substring(hashIndex + 1);
  const result: Record<string, string> = {};
  for (const pair of hash.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }

  return result;
};

const ResetPasswordScreen = () => {
  const { theme, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    error_description?: string;
  }>();

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const mapResetPasswordSessionError = useCallback(
    (message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? '';

      if (normalizedMessage.includes('expired')) {
        return t('auth.resetPassword.expiredLink');
      }

      if (
        normalizedMessage.includes('invalid') ||
        normalizedMessage.includes('otp') ||
        normalizedMessage.includes('token')
      ) {
        return t('auth.resetPassword.invalidLink');
      }

      if (
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('request failed')
      ) {
        return t('auth.resetPassword.networkError');
      }

      return t('auth.resetPassword.verifyFailed');
    },
    [t]
  );

  const mapResetPasswordUpdateError = useCallback(
    (message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? '';

      if (
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('request failed')
      ) {
        return t('auth.resetPassword.networkError');
      }

      if (normalizedMessage.includes('expired')) {
        return t('auth.resetPassword.expiredLink');
      }

      if (normalizedMessage.includes('invalid')) {
        return t('auth.resetPassword.invalidLink');
      }

      return t('auth.resetPassword.genericError');
    },
    [t]
  );

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const establishSession = async () => {
      if (params.error_description) {
        setSessionError(mapResetPasswordSessionError(params.error_description));
        return;
      }

      let accessToken = params.access_token;
      let refreshToken = params.refresh_token;

      if (!accessToken || !refreshToken) {
        try {
          const initialUrl = await getInitialURL();
          if (initialUrl) {
            const hashParams = parseHashFragment(initialUrl);
            if (hashParams.error_description) {
              setSessionError(mapResetPasswordSessionError(hashParams.error_description));
              return;
            }

            accessToken = accessToken || hashParams.access_token;
            refreshToken = refreshToken || hashParams.refresh_token;
          }
        } catch {
          // No-op: getInitialURL may fail on some environments.
        }
      }

      if (!accessToken || !refreshToken) {
        setSessionError(t('auth.resetPassword.invalidLink'));
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { error: sessionSetupError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionSetupError) {
          setSessionError(t('auth.resetPassword.expiredLink'));
          return;
        }

        setSessionReady(true);
      } catch {
        setSessionError(t('auth.resetPassword.verifyFailed'));
      }
    };

    establishSession();
  }, [
    mapResetPasswordSessionError,
    params.access_token,
    params.error_description,
    params.refresh_token,
    t
  ]);

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
        setError(mapResetPasswordUpdateError(result.error.message));
        return;
      }

      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch {
      setError(t('auth.resetPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [mapResetPasswordUpdateError, password, router, t, validate]);

  if (sessionError) {
    return (
      <AuthScreenLayout
        testID="reset-password-error"
        heading={t('auth.resetPassword.errorHeading')}
        showAppIcon={false}
      >
        <View style={[styles.formGroup, { gap: spacing.md }]}>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{sessionError}</Text>
          <Button
            testID="request-new-link-button"
            variant="primary"
            size="large"
            onPress={() => router.replace('/forgot-password')}
            accessibilityLabel={t('auth.accessibility.requestNewLink')}
          >
            {t('auth.resetPassword.requestNewLink')}
          </Button>
        </View>
      </AuthScreenLayout>
    );
  }

  if (!sessionReady) {
    return (
      <View
        testID="reset-password-loading"
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator testID="session-loading-indicator" size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>
          {t('auth.resetPassword.verifyingLink')}
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <AuthScreenLayout
        testID="reset-password-success"
        heading={t('auth.resetPassword.successHeading')}
        showAppIcon={false}
      >
        <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
          {t('auth.resetPassword.redirectingHome')}
        </Text>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      testID="reset-password-screen"
      heading={t('auth.resetPassword.heading')}
      headingTestID="reset-password-title"
      subtitle={t('auth.resetPassword.subtitle')}
      subtitleTestID="reset-password-subtitle"
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
          accessibilityLabel={t('auth.resetPassword.button')}
        >
          {t('auth.resetPassword.button')}
        </Button>
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  formGroup: {
    width: '100%'
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default ResetPasswordScreen;
