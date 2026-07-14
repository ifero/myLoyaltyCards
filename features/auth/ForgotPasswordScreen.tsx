import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isValidEmail } from '@/core/auth/validation';

import { Button, TextField } from '@/shared/components/ui';
import { sendPasswordResetOtp } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner } from './components';

const ForgotPasswordScreen = () => {
  const { theme, spacing, touchTarget } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const trimmedEmail = email.trim();
      const result = await sendPasswordResetOtp(trimmedEmail);

      if (!result.success) {
        setError(mapForgotPasswordErrorMessage(result.error.message));
        return;
      }

      // Mirror the signup flow (CreateAccountScreen): hand off to the shared
      // OTP screen with the email + a send timestamp that seeds the resend
      // cooldown. This replaces the old "check your email" dead-end — the user
      // now enters the emailed code in-app.
      router.push({
        pathname: '/recovery-otp',
        params: {
          email: trimmedEmail,
          sentAt: String(Date.now())
        }
      });
    } catch {
      setError(t('auth.forgotPassword.genericError'));
    } finally {
      setLoading(false);
    }
  }, [email, mapForgotPasswordErrorMessage, router, t, validate]);

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
      <View style={[styles.formGroup, { gap: spacing.md }]}>
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
          accessibilityLabel={t('auth.accessibility.sendResetCode')}
        >
          {t('auth.forgotPassword.sendResetCode')}
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

const styles = StyleSheet.create({
  formGroup: {
    width: '100%'
  }
});

export default ForgotPasswordScreen;
