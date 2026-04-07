import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

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
        setSessionError(params.error_description);
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
              setSessionError(hashParams.error_description);
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
        setSessionError('Invalid or expired reset link. Please request a new one.');
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { error: sessionSetupError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionSetupError) {
          setSessionError('This reset link has expired. Please request a new one.');
          return;
        }

        setSessionReady(true);
      } catch {
        setSessionError('Failed to verify reset link. Please try again.');
      }
    };

    establishSession();
  }, [params.access_token, params.error_description, params.refresh_token]);

  const validate = useCallback(() => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      errors.password = 'Password is required.';
    } else if (!isValidPassword(password)) {
      errors.password = 'Min 8 characters, at least one letter and one number.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [confirmPassword, password]);

  const handleUpdatePassword = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [password, router, validate]);

  if (sessionError) {
    return (
      <AuthScreenLayout
        testID="reset-password-error"
        heading="Reset Link Invalid"
        showAppIcon={false}
      >
        <View className="w-full" style={{ gap: spacing.md }}>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{sessionError}</Text>
          <Button
            testID="request-new-link-button"
            variant="primary"
            size="large"
            onPress={() => router.replace('/forgot-password')}
            accessibilityLabel="Request a new reset link"
          >
            Request New Link
          </Button>
        </View>
      </AuthScreenLayout>
    );
  }

  if (!sessionReady) {
    return (
      <View
        testID="reset-password-loading"
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator testID="session-loading-indicator" size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Verifying reset link…</Text>
      </View>
    );
  }

  if (success) {
    return (
      <AuthScreenLayout
        testID="reset-password-success"
        heading="Password Updated!"
        showAppIcon={false}
      >
        <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
          Redirecting to home…
        </Text>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      testID="reset-password-screen"
      heading="Set New Password"
      headingTestID="reset-password-title"
      subtitle="Choose a strong new password for your account."
      subtitleTestID="reset-password-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <ErrorBanner message={error} testID="server-error" />

        <View>
          <PasswordInput
            testID="password-input"
            label="New Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) {
                setFieldErrors((previous) => ({ ...previous, password: undefined }));
              }
            }}
            placeholder="Min 8 chars, 1 letter, 1 number"
            autoComplete="new-password"
            accessibilityHint="Minimum 8 characters with at least one letter and one number"
            error={fieldErrors.password}
          />
          <PasswordStrengthIndicator password={password} />
        </View>

        <PasswordInput
          testID="confirm-password-input"
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((previous) => ({ ...previous, confirmPassword: undefined }));
            }
          }}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          accessibilityHint="Re-enter your new password to confirm"
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
          Password must be at least 8 characters with at least one letter and one number.
        </Text>

        <Button
          testID="update-password-button"
          variant="primary"
          size="large"
          onPress={handleUpdatePassword}
          loading={loading}
          accessibilityLabel="Update Password"
        >
          Update Password
        </Button>
      </View>
    </AuthScreenLayout>
  );
};

export default ResetPasswordScreen;
