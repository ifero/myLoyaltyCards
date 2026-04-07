import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { isValidEmail } from '@/core/auth/validation';

import { Button, TextField } from '@/shared/components/ui';
import { signInWithEmail } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner, PasswordInput } from './components';

const mapSignInErrorMessage = (code?: string, message?: string) => {
  if (code === 'invalid_credentials') {
    return 'Incorrect email or password. Please try again.';
  }

  if (code === 'email_not_confirmed') {
    return 'Please verify your email address first.';
  }

  if (message?.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (message?.toLowerCase().includes('network')) {
    return 'Unable to connect. Check your internet and try again.';
  }

  if (message?.trim()) {
    return message;
  }

  return 'Something went wrong. Please try again.';
};

const SignInScreen = () => {
  const { theme, spacing, touchTarget } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validate = useCallback(() => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  const handleSignIn = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await signInWithEmail(email.trim(), password);

      if (!result.success) {
        setError(mapSignInErrorMessage(result.error.code, result.error.message));
        return;
      }

      router.replace('/');
    } catch {
      setError('Unable to connect. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, router, validate]);

  const hasFormError = Boolean(error);

  return (
    <AuthScreenLayout
      testID="sign-in-screen"
      heading="Welcome Back"
      subtitle="Sign in to sync your loyalty cards across devices"
      headingTestID="sign-in-title"
      subtitleTestID="sign-in-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <ErrorBanner message={error} testID="server-error" />

        <TextField
          testID="email-input"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors((previous) => ({ ...previous, email: undefined }));
            }
            if (error) {
              setError(null);
            }
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel="Email"
          accessibilityHint="Enter your email address"
          error={fieldErrors.email}
          hasError={hasFormError}
        />

        <PasswordInput
          testID="password-input"
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (fieldErrors.password) {
              setFieldErrors((previous) => ({ ...previous, password: undefined }));
            }
            if (error) {
              setError(null);
            }
          }}
          placeholder="Your password"
          autoComplete="current-password"
          accessibilityHint="Enter your password"
          error={fieldErrors.password}
          hasError={hasFormError}
        />

        <Pressable
          testID="forgot-password-link"
          onPress={() => router.push('/forgot-password')}
          accessibilityRole="button"
          accessibilityLabel="Forgot password"
          style={{
            alignSelf: 'flex-end',
            minHeight: touchTarget.min,
            justifyContent: 'center',
            minWidth: touchTarget.min
          }}
        >
          <Text style={{ color: theme.link, fontWeight: '600' }}>Forgot password?</Text>
        </Pressable>

        <Button
          testID="sign-in-button"
          variant="primary"
          size="large"
          onPress={handleSignIn}
          loading={loading}
          accessibilityLabel="Sign In"
        >
          Sign In
        </Button>

        <AuthLink
          testID="create-account-link"
          prefixText="Don't have an account?"
          actionText="Create one"
          onPress={() => router.push('/create-account')}
          accessibilityLabel="Create one"
        />
      </View>
    </AuthScreenLayout>
  );
};

export default SignInScreen;
