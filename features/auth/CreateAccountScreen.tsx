import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { isValidEmail, isValidPassword } from '@/core/auth/validation';
import { setConsentGiven } from '@/core/privacy/consent-repository';

import ConsentCheckbox from '@/shared/components/ConsentCheckbox';
import { Button, TextField } from '@/shared/components/ui';
import { signUp } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import {
  AuthLink,
  AuthScreenLayout,
  ErrorBanner,
  PasswordInput,
  PasswordStrengthIndicator
} from './components';

const CreateAccountScreen = () => {
  const { theme, spacing, typography } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const prefilledEmail = Array.isArray(params.email)
    ? (params.email[0] ?? '')
    : (params.email ?? '');

  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    consent?: string;
  }>({});

  const validateEmailField = useCallback((value: string) => {
    if (!value.trim()) {
      return 'Email is required.';
    }

    if (!isValidEmail(value)) {
      return 'Please enter a valid email address';
    }

    return undefined;
  }, []);

  useEffect(() => {
    setEmail(prefilledEmail);
    setPassword('');
    setConfirmPassword('');
    setConsent(false);
    setLoading(false);
    setError(null);
    setEmailTouched(false);
    setFieldErrors({});
  }, [prefilledEmail]);

  const validate = useCallback(() => {
    const errors: typeof fieldErrors = {};

    const emailError = validateEmailField(email);
    if (emailError) {
      errors.email = emailError;
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
  }, [confirmPassword, consent, email, fieldErrors, password, validateEmailField]);

  const handleRegister = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const result = await signUp(trimmedEmail, password);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setConsentGiven();

      if (result.data.session) {
        router.replace('/');
      } else {
        router.push({
          pathname: '/verify-email',
          params: {
            email: trimmedEmail,
            sentAt: String(Date.now())
          }
        });
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, router, validate]);

  return (
    <AuthScreenLayout
      testID="create-account-screen"
      heading="Create Account"
      subtitle="Join My Loyalty Cards"
      headingTestID="create-account-title"
      subtitleTestID="create-account-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <TextField
          testID="email-input"
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors((previous) => ({ ...previous, email: undefined }));
            }
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel="Email"
          accessibilityHint="Enter your email address"
          onBlur={() => {
            setEmailTouched(true);
            const emailError = validateEmailField(email);
            setFieldErrors((previous) => ({ ...previous, email: emailError }));
          }}
          error={emailTouched ? fieldErrors.email : undefined}
        />

        <View>
          <PasswordInput
            testID="password-input"
            label="Password"
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
          {password.trim().length > 0 ? <PasswordStrengthIndicator password={password} /> : null}
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
          placeholder="Re-enter your password"
          autoComplete="new-password"
          accessibilityHint="Re-enter your password to confirm"
          error={fieldErrors.confirmPassword}
        />

        <Text
          testID="password-requirements"
          style={{
            color: theme.textSecondary,
            fontSize: typography.caption1.fontSize,
            lineHeight: typography.caption1.lineHeight,
            marginTop: -spacing.sm
          }}
        >
          Password must be at least 8 characters with at least one letter and one number.
        </Text>

        <View>
          <ConsentCheckbox checked={consent} onToggle={setConsent} />
          {fieldErrors.consent ? (
            <Text
              testID="consent-error"
              style={{
                color: theme.error,
                fontSize: typography.caption1.fontSize,
                lineHeight: typography.caption1.lineHeight,
                marginTop: spacing.xs
              }}
            >
              {fieldErrors.consent}
            </Text>
          ) : null}
        </View>

        <ErrorBanner message={error} testID="server-error" />

        <Button
          testID="register-button"
          variant="primary"
          size="large"
          onPress={handleRegister}
          loading={loading}
          disabled={!consent}
          accessibilityLabel="Create Account"
        >
          Create Account
        </Button>

        <AuthLink
          testID="sign-in-link"
          prefixText="Already have an account?"
          actionText="Sign in"
          onPress={() => router.push('/sign-in')}
          accessibilityLabel="Sign in"
        />
      </View>
    </AuthScreenLayout>
  );
};

export default CreateAccountScreen;
