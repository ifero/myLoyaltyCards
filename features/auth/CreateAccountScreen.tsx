/**
 * CreateAccountScreen
 * Story 6-6: Create Account with Email
 *
 * Registration form with email, password, and confirm password.
 * Validates input client-side, calls Supabase signUp, stores
 * session securely via expo-secure-store (handled by the Supabase
 * client adapter), and redirects to the home screen on success.
 *
 * Uses the shared ConsentCheckbox (Story 6-4) for privacy consent.
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

import { setConsentGiven } from '@/core/privacy/consent-repository';

import ConsentCheckbox from '@/shared/components/ConsentCheckbox';
import { signUp } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Loose RFC-5322-ish check — covers the practical 99 % of valid addresses. */
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

/**
 * Password must be at least 8 characters, contain at least one letter and
 * one digit. Matches the story acceptance criteria exactly.
 */
const isValidPassword = (pw: string): boolean => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreateAccountScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    consent?: string;
  }>({});

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** Validate all fields and return true when the form is ready. */
  const validate = useCallback((): boolean => {
    const errors: typeof fieldErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

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

    if (!consent) {
      errors.consent = 'You must agree to the Privacy Policy.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, confirmPassword, consent]);

  const handleRegister = useCallback(async () => {
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await signUp(email.trim(), password);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Persist consent record locally (version + timestamp)
      setConsentGiven();

      // Only redirect when a session exists. When email confirmation is
      // required, Supabase returns success with `session: null` — the user
      // should not navigate into the app until they confirm their email.
      if (result.data.session) {
        // The Supabase client adapter automatically persists the session in SecureStore.
        router.replace('/');
      } else {
        setError(
          'Registration successful! Please check your email to confirm your account before signing in.'
        );
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, validate, router]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <KeyboardAvoidingView
      testID="create-account-screen"
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
            testID="create-account-title"
            accessibilityRole="header"
            className="mb-2 text-2xl font-bold"
            style={{ color: theme.textPrimary }}
          >
            Create Account
          </Text>
          <Text className="mb-8 text-sm" style={{ color: theme.textSecondary }}>
            Register with your email to sync your cards across devices.
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
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            accessibilityLabel="Email"
            accessibilityHint="Enter your email address"
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

          {/* ---- Password ---- */}
          <Text className="mb-1 text-sm font-medium" style={{ color: theme.textPrimary }}>
            Password
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
            accessibilityLabel="Password"
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
            placeholder="Re-enter your password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="new-password"
            accessibilityLabel="Confirm password"
            accessibilityHint="Re-enter your password to confirm"
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

          {/* ---- Consent ---- */}
          <View className="mb-6">
            <ConsentCheckbox checked={consent} onToggle={setConsent} />
            {fieldErrors.consent && (
              <Text testID="consent-error" className="mt-1 text-xs" style={{ color: '#EF4444' }}>
                {fieldErrors.consent}
              </Text>
            )}
          </View>

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

          {/* ---- Register button ---- */}
          <Pressable
            testID="register-button"
            onPress={handleRegister}
            disabled={loading || !consent}
            accessibilityRole="button"
            accessibilityLabel="Register"
            accessibilityState={{ disabled: loading || !consent }}
            className="h-[52px] items-center justify-center rounded-xl"
            style={({ pressed }) => ({
              backgroundColor:
                loading || !consent ? theme.border : pressed ? theme.primaryDark : theme.primary,
              opacity: loading || !consent ? 0.7 : 1,
              transform: [{ scale: pressed && !loading && consent ? 0.98 : 1 }]
            })}
          >
            {loading ? (
              <ActivityIndicator testID="loading-indicator" color="#FFFFFF" />
            ) : (
              <Text className="text-base font-semibold text-white">Register</Text>
            )}
          </Pressable>

          {/* ---- Link to Sign In ---- */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm" style={{ color: theme.textSecondary }}>
              {'Already have an account? '}
            </Text>
            <Pressable
              testID="sign-in-link"
              onPress={() => router.push('/sign-in')}
              accessibilityRole="link"
              accessibilityLabel="Sign in"
            >
              <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
                Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateAccountScreen;
