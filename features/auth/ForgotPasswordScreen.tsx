import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { isValidEmail } from '@/core/auth/validation';

import { Button, TextField } from '@/shared/components/ui';
import { requestPasswordReset } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner } from './components';

const ForgotPasswordScreen = () => {
  const { theme, spacing, touchTarget } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});

  const mapForgotPasswordErrorMessage = useCallback(
    (message?: string) => {
      const normalizedMessage = message?.toLowerCase() ?? '';

      if (
        normalizedMessage.includes('network') ||
        normalizedMessage.includes('failed to fetch') ||
        normalizedMessage.includes('request failed')
      ) {
        return t('auth.forgotPassword.networkError');
      }

      return t('auth.forgotPassword.genericError');
    },
    [t]
  );

  const validate = useCallback(() => {
    const errors: { email?: string } = {};

    if (!email.trim()) {
      errors.email = t('auth.validation.emailRequired');
    } else if (!isValidEmail(email)) {
      errors.email = t('auth.validation.emailInvalid');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, t]);

  const handleSendReset = useCallback(async () => {
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.success) {
        setError(mapForgotPasswordErrorMessage(result.error.message));
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t('auth.forgotPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [email, mapForgotPasswordErrorMessage, t, validate]);

  const handleTryAgain = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await requestPasswordReset(email.trim());

      if (!result.success) {
        setSubmitted(false);
        setError(mapForgotPasswordErrorMessage(result.error.message));
      }
    } catch {
      setSubmitted(false);
      setError(t('auth.forgotPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [email, mapForgotPasswordErrorMessage, t]);

  if (submitted) {
    return (
      <AuthScreenLayout
        testID="forgot-password-confirmation"
        heading={t('auth.forgotPassword.confirmationHeading')}
        headingTestID="confirmation-title"
        subtitle={t('auth.forgotPassword.confirmationSubtitle')}
        subtitleTestID="confirmation-subtitle"
        showAppIcon={false}
      >
        <View className="w-full items-center">
          <View testID="reset-password-confirmation-icon" className="mb-6">
            <MaterialIcons name="mail-outline" size={56} color={theme.primary} />
          </View>

          <AuthLink
            testID="try-again-button"
            actionText={t('auth.forgotPassword.tryAgain')}
            onPress={handleTryAgain}
            accessibilityLabel={t('auth.forgotPassword.tryAgain')}
          />

          <AuthLink
            testID="back-to-sign-in-button"
            actionText={t('auth.forgotPassword.backToSignIn')}
            onPress={() => router.push('/sign-in')}
            accessibilityLabel={t('auth.accessibility.backToSignIn')}
          />
        </View>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      testID="forgot-password-screen"
      heading={t('auth.forgotPassword.heading')}
      headingTestID="forgot-password-title"
      subtitle={t('auth.forgotPassword.subtitle')}
      subtitleTestID="forgot-password-subtitle"
      centerContent
      showAppIcon={false}
      headerContent={
        <Pressable
          testID="forgot-password-back-chevron"
          accessibilityRole="button"
          accessibilityLabel={t('auth.accessibility.back')}
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
          label={t('auth.fields.email')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (fieldErrors.email) {
              setFieldErrors({});
            }
          }}
          placeholder={t('auth.placeholders.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          accessibilityLabel={t('auth.fields.email')}
          accessibilityHint={t('auth.accessibility.forgotPasswordEmailHint')}
          error={fieldErrors.email}
        />

        <Button
          testID="send-reset-button"
          variant="primary"
          size="large"
          onPress={handleSendReset}
          loading={loading}
          accessibilityLabel={t('auth.accessibility.sendResetLink')}
        >
          {t('auth.forgotPassword.sendResetLink')}
        </Button>

        <AuthLink
          testID="back-to-sign-in-link"
          actionText={t('auth.forgotPassword.backToSignIn')}
          onPress={() => router.push('/sign-in')}
          accessibilityLabel={t('auth.accessibility.backToSignIn')}
        />
      </View>
    </AuthScreenLayout>
  );
};

export default ForgotPasswordScreen;
