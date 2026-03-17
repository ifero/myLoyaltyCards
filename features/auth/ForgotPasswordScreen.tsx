/**
 * ForgotPasswordScreen
 * Story 6-8: Password Reset
 *
 * Email entry form to request a password reset link.
 * Always shows a success message after submission — never reveals
 * whether the email is actually registered (prevents user enumeration).
 *
 * ⚠️ Never log user credentials or session tokens in this component.
 */

import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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

import { requestPasswordReset } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Loose RFC-5322-ish check — covers the practical 99 % of valid addresses. */
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ForgotPasswordScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [submitted, setSubmitted] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Validate email and return true when the form is ready. */
  const validate = useCallback((): boolean => {
    const errors: typeof fieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email]);

  const handleSendReset = useCallback(async () => {
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Always show confirmation — prevents user enumeration
      setSubmitted(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, validate]);

  // ---------------------------------------------------------------------------
  // Confirmation view (after successful submission)
  // ---------------------------------------------------------------------------

  if (submitted) {
    return (
      <View
        testID="forgot-password-confirmation"
        className="flex-1 px-6 pt-8"
        style={{ backgroundColor: theme.background }}
      >
        <Text
          testID="confirmation-title"
          accessibilityRole="header"
          className="mb-4 text-2xl font-bold"
          style={{ color: theme.textPrimary }}
        >
          Check Your Email
        </Text>
        <Text className="mb-4 text-base leading-6" style={{ color: theme.textSecondary }}>
          {
            "If an account exists for that email, we've sent a reset link. Check your inbox and spam folder."
          }
        </Text>
        <Text className="mb-8 text-sm" style={{ color: theme.textSecondary }}>
          {"Didn't receive it? Check your spam folder or try again."}
        </Text>

        <Pressable
          testID="back-to-sign-in-button"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Sign In"
          className="h-[52px] items-center justify-center rounded-xl"
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.primaryDark : theme.primary,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}
        >
          <Text className="text-base font-semibold text-white">Back to Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Email entry form
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      testID="forgot-password-screen"
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
            testID="forgot-password-title"
            accessibilityRole="header"
            className="mb-2 text-2xl font-bold"
            style={{ color: theme.textPrimary }}
          >
            Forgot Password?
          </Text>
          <Text className="mb-8 text-sm" style={{ color: theme.textSecondary }}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          {/* ---- Email ---- */}
          <Text className="mb-1 text-sm font-medium" style={{ color: theme.textPrimary }}>
            Email
          </Text>
          <TextInput
            testID="email-input"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (fieldErrors.email) setFieldErrors({});
            }}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            accessibilityLabel="Email"
            accessibilityHint="Enter your email address to receive a reset link"
            className="mb-1 h-12 rounded-lg border px-4 text-base"
            style={{
              borderColor: fieldErrors.email ? '#EF4444' : theme.border,
              color: theme.textPrimary,
              backgroundColor: theme.surface
            }}
          />
          {fieldErrors.email && (
            <Text testID="email-error" className="mb-3 text-xs" style={{ color: '#EF4444' }}>
              {fieldErrors.email}
            </Text>
          )}
          {!fieldErrors.email && <View className="mb-3" />}

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

          {/* ---- Send Reset Link button ---- */}
          <Pressable
            testID="send-reset-button"
            onPress={handleSendReset}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Send Reset Link"
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
              <Text className="text-base font-semibold text-white">Send Reset Link</Text>
            )}
          </Pressable>

          {/* ---- Back to Sign In link ---- */}
          <View className="mt-6 flex-row items-center justify-center">
            <Pressable
              testID="back-to-sign-in-link"
              onPress={() => router.back()}
              accessibilityRole="link"
              accessibilityLabel="Back to Sign In"
            >
              <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
                Back to Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
