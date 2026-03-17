/**
 * ResetPasswordScreen
 * Story 6-8: Password Reset
 *
 * Receives the Supabase access/refresh tokens from the deep-link URL,
 * establishes a session, and presents a new-password form.
 * On success the user is signed in automatically and navigated home.
 *
 * ⚠️ Never log user credentials or session tokens in this component.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';

import { isValidPassword } from '@/core/auth/validation';
import { getInitialURL } from '@/core/utils/get-initial-url';

import { updatePassword } from '@/shared/supabase/auth';
import { getSupabaseClient } from '@/shared/supabase/client';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse tokens from a URL hash fragment.
 * Supabase may deliver reset tokens as `#access_token=...&refresh_token=...`
 * rather than query parameters. This utility handles both formats.
 */
const parseHashFragment = (url: string): Record<string, string> => {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return {};
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ResetPasswordScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    type?: string;
    error_description?: string;
  }>();

  // Ref for cleanup of auto-redirect timer
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  // ---------------------------------------------------------------------------
  // Session establishment from deep-link tokens
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const establishSession = async () => {
      // Check if the link itself carried an error (e.g. expired token)
      if (params.error_description) {
        setSessionError(params.error_description);
        return;
      }

      let accessToken = params.access_token;
      let refreshToken = params.refresh_token;

      // Fallback: Supabase may deliver tokens as a URL hash fragment
      // (#access_token=...&refresh_token=...) which Expo Router's
      // useLocalSearchParams does not parse.
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
          // getInitialURL() can reject on some platforms — ignore
        }
      }

      if (!accessToken || !refreshToken) {
        // No tokens — may have been opened manually (not from email link)
        setSessionError('Invalid or expired reset link. Please request a new one.');
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionErr) {
          setSessionError('This reset link has expired. Please request a new one.');
          return;
        }

        setSessionReady(true);
      } catch {
        setSessionError('Failed to verify reset link. Please try again.');
      }
    };

    establishSession();
  }, [params.access_token, params.refresh_token, params.error_description]);

  // Cleanup redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const errors: typeof fieldErrors = {};

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
  }, [password, confirmPassword]);

  const handleUpdatePassword = useCallback(async () => {
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSuccess(true);
      // Auto-navigate home after a brief delay so user sees confirmation
      redirectTimerRef.current = setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [password, validate, router]);

  // ---------------------------------------------------------------------------
  // Error state (invalid/expired link)
  // ---------------------------------------------------------------------------

  if (sessionError) {
    return (
      <View
        testID="reset-password-error"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <Text
          accessibilityRole="header"
          className="mb-4 text-center text-lg font-semibold"
          style={{ color: theme.textPrimary }}
        >
          Reset Link Invalid
        </Text>
        <Text className="mb-8 text-center text-sm" style={{ color: theme.textSecondary }}>
          {sessionError}
        </Text>
        <Pressable
          testID="request-new-link-button"
          onPress={() => router.replace('/forgot-password')}
          accessibilityRole="button"
          accessibilityLabel="Request a new reset link"
          className="h-[52px] w-full items-center justify-center rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.primaryDark : theme.primary,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}
        >
          <Text className="text-base font-semibold text-white">Request New Link</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading state (establishing session from tokens)
  // ---------------------------------------------------------------------------

  if (!sessionReady) {
    return (
      <View
        testID="reset-password-loading"
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator testID="session-loading-indicator" size="large" color={theme.primary} />
        <Text className="mt-4 text-sm" style={{ color: theme.textSecondary }}>
          Verifying reset link…
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------

  if (success) {
    return (
      <View
        testID="reset-password-success"
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background }}
      >
        <Text className="mb-4 text-center text-2xl font-bold" style={{ color: theme.textPrimary }}>
          Password Updated!
        </Text>
        <Text className="text-center text-sm" style={{ color: theme.textSecondary }}>
          Redirecting to home…
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // New password form
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      testID="reset-password-screen"
      className="flex-1"
      style={{ backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-8">
          {/* Title */}
          <Text
            testID="reset-password-title"
            accessibilityRole="header"
            className="mb-2 text-2xl font-bold"
            style={{ color: theme.textPrimary }}
          >
            Set New Password
          </Text>
          <Text className="mb-8 text-sm" style={{ color: theme.textSecondary }}>
            Choose a strong new password for your account.
          </Text>

          {/* ---- New Password ---- */}
          <Text className="mb-1 text-sm font-medium" style={{ color: theme.textPrimary }}>
            New Password
          </Text>
          <TextInput
            testID="password-input"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (fieldErrors.password)
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="Min 8 chars, 1 letter, 1 number"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="new-password"
            accessibilityLabel="New Password"
            accessibilityHint="Minimum 8 characters with at least one letter and one number"
            className="mb-1 h-12 rounded-lg border px-4 text-base"
            style={{
              borderColor: fieldErrors.password ? '#EF4444' : theme.border,
              color: theme.textPrimary,
              backgroundColor: theme.surface
            }}
          />
          {fieldErrors.password && (
            <Text testID="password-error" className="mb-3 text-xs" style={{ color: '#EF4444' }}>
              {fieldErrors.password}
            </Text>
          )}
          {!fieldErrors.password && <View className="mb-3" />}

          {/* ---- Confirm Password ---- */}
          <Text className="mb-1 text-sm font-medium" style={{ color: theme.textPrimary }}>
            Confirm Password
          </Text>
          <TextInput
            testID="confirm-password-input"
            value={confirmPassword}
            onChangeText={(t) => {
              setConfirmPassword(t);
              if (fieldErrors.confirmPassword)
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            placeholder="Re-enter your new password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="new-password"
            accessibilityLabel="Confirm Password"
            accessibilityHint="Re-enter your new password to confirm"
            className="mb-1 h-12 rounded-lg border px-4 text-base"
            style={{
              borderColor: fieldErrors.confirmPassword ? '#EF4444' : theme.border,
              color: theme.textPrimary,
              backgroundColor: theme.surface
            }}
          />
          {fieldErrors.confirmPassword && (
            <Text
              testID="confirm-password-error"
              className="mb-3 text-xs"
              style={{ color: '#EF4444' }}
            >
              {fieldErrors.confirmPassword}
            </Text>
          )}
          {!fieldErrors.confirmPassword && <View className="mb-3" />}

          {/* ---- Password requirements hint ---- */}
          <Text
            testID="password-requirements"
            className="mb-6 text-xs"
            style={{ color: theme.textSecondary }}
          >
            Password must be at least 8 characters with at least one letter and one number.
          </Text>

          {/* ---- Server error banner ---- */}
          {error && (
            <View
              testID="server-error"
              className="mb-4 rounded-lg px-4 py-3"
              style={{ backgroundColor: '#FEE2E2' }}
              accessibilityRole="alert"
            >
              <Text className="text-sm" style={{ color: '#991B1B' }}>
                {error}
              </Text>
            </View>
          )}

          {/* ---- Update Password button ---- */}
          <Pressable
            testID="update-password-button"
            onPress={handleUpdatePassword}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Update Password"
            accessibilityState={{ disabled: loading }}
            className="h-[52px] items-center justify-center rounded-xl"
            style={({ pressed }) => ({
              backgroundColor: loading ? theme.border : pressed ? theme.primaryDark : theme.primary,
              opacity: loading ? 0.7 : 1,
              transform: [{ scale: pressed && !loading ? 0.98 : 1 }]
            })}
          >
            {loading ? (
              <ActivityIndicator testID="loading-indicator" color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Update Password</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ResetPasswordScreen;
