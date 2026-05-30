import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  const validateEmailField = useCallback(
    (value: string) => {
      if (!value.trim()) {
        return t('auth.validation.emailRequired');
      }

      if (!isValidEmail(value)) {
        return t('auth.validation.emailInvalid');
      }

      return undefined;
    },
    [t]
  );

  const mapCreateAccountErrorMessage = useCallback(
    (code?: string, message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? '';

      if (
        code === 'user_already_exists' ||
        normalizedMessage.includes('already registered') ||
        normalizedMessage.includes('already been registered')
      ) {
        return t('auth.createAccount.accountExists');
      }

      if (
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('request failed')
      ) {
        return t('auth.createAccount.networkError');
      }

      return t('auth.createAccount.genericError');
    },
    [t]
  );

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
      errors.password = t('auth.validation.passwordRequired');
    } else if (!isValidPassword(password)) {
      errors.password = t('auth.validation.passwordRule');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('auth.validation.confirmPasswordRequired');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('auth.validation.passwordsMismatch');
    }

    if (!consent) {
      errors.consent = t('auth.validation.consentRequired');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [confirmPassword, consent, email, fieldErrors, password, t, validateEmailField]);

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
        setError(mapCreateAccountErrorMessage(result.error.code, result.error.message));
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
      setError(t('auth.createAccount.genericError'));
    } finally {
      setLoading(false);
    }
  }, [email, mapCreateAccountErrorMessage, password, router, t, validate]);

  return (
    <AuthScreenLayout
      testID="create-account-screen"
      heading={t('auth.createAccount.heading')}
      subtitle={t('auth.createAccount.subtitle')}
      headingTestID="create-account-title"
      subtitleTestID="create-account-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <TextField
          testID="email-input"
          label={t('auth.fields.email')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors((previous) => ({ ...previous, email: undefined }));
            }
          }}
          placeholder={t('auth.placeholders.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel={t('auth.fields.email')}
          accessibilityHint={t('auth.accessibility.emailHint')}
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
            label={t('auth.fields.password')}
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
          {password.trim().length > 0 ? <PasswordStrengthIndicator password={password} /> : null}
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
          placeholder={t('auth.placeholders.confirmPassword')}
          autoComplete="new-password"
          accessibilityHint={t('auth.accessibility.confirmPasswordHint')}
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
          {t('auth.createAccount.passwordRequirements')}
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
          accessibilityLabel={t('common.actions.createAccount')}
        >
          {t('auth.createAccount.button')}
        </Button>

        <AuthLink
          testID="sign-in-link"
          prefixText={t('auth.createAccount.alreadyHaveAccount')}
          actionText={t('auth.createAccount.signInAction')}
          onPress={() => router.push('/sign-in')}
          accessibilityLabel={t('common.actions.signIn')}
        />
      </View>
    </AuthScreenLayout>
  );
};

export default CreateAccountScreen;
