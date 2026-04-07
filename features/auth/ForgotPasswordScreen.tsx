import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { isValidEmail } from '@/core/auth/validation';

import { Button, TextField } from '@/shared/components/ui';
import { requestPasswordReset } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner } from './components';

const ForgotPasswordScreen = () => {
  const { theme, spacing, touchTarget } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  const validate = useCallback(() => {
    const errors: { email?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email]);

  const handleSendReset = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setSubmitted(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, validate]);

  const handleTryAgain = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.success) {
        setSubmitted(false);
        setError(result.error.message);
      }
    } catch {
      setSubmitted(false);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  if (submitted) {
    return (
      <AuthScreenLayout
        testID="forgot-password-confirmation"
        heading="Check your email"
        headingTestID="confirmation-title"
        subtitle="If an account exists for that email, we've sent a reset link. Check your inbox and spam folder."
        subtitleTestID="confirmation-subtitle"
        showAppIcon={false}
      >
        <View className="w-full items-center">
          <View testID="reset-password-confirmation-icon" className="mb-6">
            <MaterialIcons name="mail-outline" size={56} color={theme.primary} />
          </View>

          <AuthLink
            testID="try-again-button"
            actionText="Try again"
            onPress={handleTryAgain}
            accessibilityLabel="Try again"
          />

          <AuthLink
            testID="back-to-sign-in-button"
            actionText="Back to Sign In"
            onPress={() => router.push('/sign-in')}
            accessibilityLabel="Back to Sign In"
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      testID="forgot-password-screen"
      heading="Forgot Password?"
      headingTestID="forgot-password-title"
      subtitle="No worries. Enter your email and we'll send you a reset link."
      subtitleTestID="forgot-password-subtitle"
      centerContent
      showAppIcon={false}
      headerContent={
        <Pressable
          testID="forgot-password-back-chevron"
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{
            minHeight: touchTarget.min,
            minWidth: touchTarget.min,
            justifyContent: 'center',
            alignItems: 'flex-start',
            marginBottom: spacing.md
          }}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.textPrimary} />
        </Pressable>
      }
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
              setFieldErrors({});
            }
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel="Email"
          accessibilityHint="Enter your email address to receive a reset link"
          error={fieldErrors.email}
        />

        <Button
          testID="send-reset-button"
          variant="primary"
          size="large"
          onPress={handleSendReset}
          loading={loading}
          accessibilityLabel="Send Reset Link"
        >
          Send Reset Link
        </Button>

        <AuthLink
          testID="back-to-sign-in-link"
          actionText="Back to Sign In"
          onPress={() => router.push('/sign-in')}
          accessibilityLabel="Back to Sign In"
        />
      </View>
    </AuthScreenLayout>
  );
};

export default ForgotPasswordScreen;
