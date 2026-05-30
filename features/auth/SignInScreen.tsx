import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { isValidEmail } from '@/core/auth/validation';

import { Button, TextField } from '@/shared/components/ui';
import { signInWithEmail } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner, PasswordInput } from './components';

const SignInScreen = () => {
  const { theme, spacing, touchTarget } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const mapSignInErrorMessage = useCallback(
    (code?: string, message?: string) => {
      if (code === 'invalid_credentials') {
        return t('auth.signIn.incorrectCredentials');
      }

      if (code === 'email_not_confirmed') {
        return t('auth.signIn.emailNotConfirmed');
      }

      if (message?.toLowerCase().includes('invalid login credentials')) {
        return t('auth.signIn.incorrectCredentials');
      }

      if (message?.toLowerCase().includes('network')) {
        return t('auth.signIn.networkError');
      }

      if (message?.toLowerCase().includes('failed to fetch')) {
        return t('auth.signIn.networkError');
      }

      return t('auth.signIn.genericError');
    },
    [t]
  );

  const validate = useCallback(() => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = t('auth.validation.emailRequired');
    } else if (!isValidEmail(email)) {
      errors.email = t('auth.validation.emailInvalid');
    }

    if (!password) {
      errors.password = t('auth.validation.passwordRequired');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, t]);

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
      setError(t('auth.signIn.networkError'));
    } finally {
      setLoading(false);
    }
  }, [email, mapSignInErrorMessage, password, router, t, validate]);

  const hasFormError = Boolean(error);

  return (
    <AuthScreenLayout
      testID="sign-in-screen"
      heading={t('auth.signIn.heading')}
      subtitle={t('auth.signIn.subtitle')}
      headingTestID="sign-in-title"
      subtitleTestID="sign-in-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <ErrorBanner message={error} testID="server-error" />

        <TextField
          testID="email-input"
          label={t('auth.fields.email')}
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
          placeholder={t('auth.placeholders.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel={t('auth.fields.email')}
          accessibilityHint={t('auth.accessibility.emailHint')}
          error={fieldErrors.email}
          hasError={hasFormError}
        />

        <PasswordInput
          testID="password-input"
          label={t('auth.fields.password')}
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
          placeholder={t('auth.placeholders.password')}
          autoComplete="current-password"
          accessibilityHint={t('auth.accessibility.passwordHint')}
          error={fieldErrors.password}
          hasError={hasFormError}
        />

        <Pressable
          testID="forgot-password-link"
          onPress={() => router.push('/forgot-password')}
          accessibilityRole="button"
          accessibilityLabel={t('auth.accessibility.forgotPassword')}
          style={{
            alignSelf: 'flex-end',
            minHeight: touchTarget.min,
            justifyContent: 'center',
            minWidth: touchTarget.min
          }}
        >
          <Text style={{ color: theme.link, fontWeight: '600' }}>
            {t('auth.signIn.forgotPassword')}
          </Text>
        </Pressable>

        <Button
          testID="sign-in-button"
          variant="primary"
          size="large"
          onPress={handleSignIn}
          loading={loading}
          accessibilityLabel={t('common.actions.signIn')}
        >
          {t('auth.signIn.button')}
        </Button>

        <AuthLink
          testID="create-account-link"
          prefixText={t('auth.signIn.noAccountPrefix')}
          actionText={t('auth.signIn.noAccountAction')}
          onPress={() => router.push('/create-account')}
          accessibilityLabel={t('auth.signIn.noAccountAction')}
        />
      </View>
    </AuthScreenLayout>
  );
};

export default SignInScreen;
