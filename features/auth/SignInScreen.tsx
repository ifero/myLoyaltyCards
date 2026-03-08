/**
 * SignInScreen
 * Story 6-7: Sign In with Email
 *
 * Sign-in form with email and password.
 * Validates input client-side, calls Supabase signInWithPassword, and
 * redirects to the home screen on success. Session persistence is handled
 * automatically by the SecureStore-backed Supabase client adapter.
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

import { signInWithEmail } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Loose RFC-5322-ish check — covers the practical 99 % of valid addresses. */
const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SignInScreen = () => {
  const { theme } = useTheme();
  const router = useRouter();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
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
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const result = await signInWithEmail(email.trim(), password);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      // Session is automatically persisted by the SecureStore adapter.
      router.replace('/');
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
      testID="sign-in-screen"
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
            testID="sign-in-title"
            accessibilityRole="header"
            className="mb-2 text-2xl font-bold"
            style={{ color: theme.textPrimary }}
          >
            Sign In
          </Text>
          <Text className="mb-8 text-sm" style={{ color: theme.textSecondary }}>
            Sign in to sync your loyalty cards across devices.
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
            placeholder="Your password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            autoComplete="current-password"
            accessibilityLabel="Password"
            accessibilityHint="Enter your password"
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

          {/* ---- Sign In button ---- */}
          <Pressable
            testID="sign-in-button"
            onPress={handleSignIn}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
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
              <Text className="text-base font-semibold text-white">Sign In</Text>
            )}
          </Pressable>

          {/* ---- Link to Create Account ---- */}
          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm" style={{ color: theme.textSecondary }}>
              {"Don't have an account? "}
            </Text>
            <Pressable
              testID="create-account-link"
              onPress={() => router.push('/create-account')}
              accessibilityRole="link"
              accessibilityLabel="Create an account"
            >
              <Text className="text-sm font-semibold" style={{ color: theme.primary }}>
                Create Account
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignInScreen;
