import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { isValidEmail } from '@/core/auth/validation';

import { Button } from '@/shared/components/ui';
import {
  type AuthResult,
  type AuthSession,
  resendVerificationEmail,
  sendPasswordResetOtp,
  verifyEmailOtp,
  verifyPasswordResetOtp
} from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner } from './components';

const OTP_LENGTH = 8;
const OTP_INPUT_MAX_LENGTH = OTP_LENGTH * 2;
const RESEND_COOLDOWN_MS = 60_000;
const resendCooldownExpiryByFlow = new Map<string, number>();

/**
 * The two OTP flows this screen serves (Story 6.19). `signup` verifies a new
 * account's email (`type: 'email'`); `recovery` verifies a password-reset code
 * (`type: 'recovery'`). The 8-digit field, cooldown and auto-submit are
 * identical — only the verify/resend calls, post-success route, wrong-email
 * fallback and display copy differ, all captured in `PURPOSE_CONFIG`.
 */
export type VerifyOtpPurpose = 'signup' | 'recovery';

type VerifyOtpRouter = ReturnType<typeof useRouter>;

type VerifyOtpConfig = {
  verify: (email: string, token: string) => Promise<AuthResult<AuthSession>>;
  resend: (email: string) => Promise<AuthResult<void>>;
  /** i18n keys — copy is the only thing that differs textually between flows. */
  copy: {
    heading: string;
    subtitle: string;
    confirm: string;
    resendCode: string;
    resendIn: string;
    wrongEmail: string;
    goBack: string;
    incorrectCode: string;
    expiredCode: string;
    verifyUnavailable: string;
    resendFailure: string;
    resendSuccess: string;
  };
  /** Navigation after a successful verification. */
  onVerified: (router: VerifyOtpRouter) => void;
  /** Where the "wrong email?" link goes (signup carries the current email). */
  onWrongEmail: (router: VerifyOtpRouter, email: string) => void;
  /** Auto-redirect when the email route param is missing/invalid. */
  onInvalidEmail: (router: VerifyOtpRouter) => void;
};

const PURPOSE_CONFIG: Record<VerifyOtpPurpose, VerifyOtpConfig> = {
  signup: {
    verify: verifyEmailOtp,
    resend: resendVerificationEmail,
    copy: {
      heading: 'auth.verifyEmail.heading',
      subtitle: 'auth.verifyEmail.subtitle',
      confirm: 'auth.verifyEmail.confirm',
      resendCode: 'auth.verifyEmail.resendCode',
      resendIn: 'auth.verifyEmail.resendIn',
      wrongEmail: 'auth.verifyEmail.wrongEmail',
      goBack: 'auth.verifyEmail.goBack',
      incorrectCode: 'auth.verifyEmail.incorrectCode',
      expiredCode: 'auth.verifyEmail.expiredCode',
      verifyUnavailable: 'auth.verifyEmail.verifyUnavailable',
      resendFailure: 'auth.verifyEmail.resendFailure',
      resendSuccess: 'auth.verifyEmail.resendSuccess'
    },
    onVerified: (router) => {
      router.dismissTo('/');
      router.replace('/');
    },
    onWrongEmail: (router, email) =>
      router.replace({ pathname: '/create-account', params: { email } }),
    onInvalidEmail: (router) => router.replace('/create-account')
  },
  recovery: {
    verify: verifyPasswordResetOtp,
    resend: sendPasswordResetOtp,
    copy: {
      heading: 'auth.recoveryOtp.heading',
      subtitle: 'auth.recoveryOtp.subtitle',
      confirm: 'auth.recoveryOtp.confirm',
      resendCode: 'auth.recoveryOtp.resendCode',
      resendIn: 'auth.recoveryOtp.resendIn',
      wrongEmail: 'auth.recoveryOtp.wrongEmail',
      goBack: 'auth.recoveryOtp.goBack',
      incorrectCode: 'auth.recoveryOtp.incorrectCode',
      expiredCode: 'auth.recoveryOtp.expiredCode',
      verifyUnavailable: 'auth.recoveryOtp.verifyUnavailable',
      resendFailure: 'auth.recoveryOtp.resendFailure',
      resendSuccess: 'auth.recoveryOtp.resendSuccess'
    },
    // The recovery session from verifyOtp is now active; hand off to the shared
    // new-password screen (which calls updatePassword). dismissTo('/') first so
    // the pushed forgot-password + recovery-otp screens are cleared from the
    // back stack (AC7) — mirroring signup's dismiss — then replace the root with
    // the new-password screen. The stack-clear lives here, not in the shared
    // NewPasswordScreen, because 6-20 reuses that screen from Settings where the
    // stack must be preserved.
    onVerified: (router) => {
      router.dismissTo('/');
      router.replace('/new-password');
    },
    onWrongEmail: (router) => router.replace('/forgot-password'),
    onInvalidEmail: (router) => router.replace('/forgot-password')
  }
};

const getSingleParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const buildCooldownFlowKey = (
  purpose: VerifyOtpPurpose,
  email: string,
  sentAt: string | undefined
) => `${purpose}::${email}::${sentAt ?? 'initial'}`;

const formatCooldown = (remainingSeconds: number) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const resolveInitialCooldownExpiry = (sentAt: string | undefined) => {
  const parsed = Number(sentAt);
  const baseTime = Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  return baseTime + RESEND_COOLDOWN_MS;
};

const resolvePersistedCooldownExpiry = (cooldownFlowKey: string, sentAt: string | undefined) =>
  resendCooldownExpiryByFlow.get(cooldownFlowKey) ?? resolveInitialCooldownExpiry(sentAt);

type StatusNoticeProps = {
  message: string;
  tone: 'error' | 'success';
  boxed?: boolean;
};

const StatusNotice = ({ message, tone, boxed = false }: StatusNoticeProps) => {
  const { theme, spacing, typography } = useTheme();
  const color = tone === 'error' ? theme.error : theme.success;
  const iconName = tone === 'error' ? 'error-outline' : 'check-circle';

  return (
    <View
      style={[
        boxed ? styles.noticeBoxed : styles.noticePlain,
        {
          justifyContent: boxed ? 'flex-start' : 'center',
          backgroundColor: boxed ? `${color}14` : 'transparent',
          paddingHorizontal: boxed ? spacing.md : 0,
          paddingVertical: boxed ? spacing.sm : 0,
          marginTop: spacing.sm,
          minHeight: boxed ? undefined : spacing.lg
        }
      ]}
    >
      <MaterialIcons name={iconName} size={18} color={color} />
      <Text
        style={{
          color,
          marginLeft: spacing.sm,
          flexShrink: 1,
          textAlign: boxed ? 'left' : 'center',
          fontSize: typography.footnote.fontSize,
          lineHeight: typography.footnote.lineHeight
        }}
      >
        {message}
      </Text>
    </View>
  );
};

const VerifyEmailScreen = ({ purpose = 'signup' }: { purpose?: VerifyOtpPurpose }) => {
  const { theme, spacing, typography, touchTarget } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[]; sentAt?: string | string[] }>();

  const config = PURPOSE_CONFIG[purpose];

  const email = getSingleParam(params.email) ?? '';
  const sentAt = getSingleParam(params.sentAt);
  const isEmailParamValid = isValidEmail(email);
  const cooldownFlowKey = useMemo(
    () => buildCooldownFlowKey(purpose, email, sentAt),
    [purpose, email, sentAt]
  );

  const inputRef = useRef<TextInput | null>(null);
  const isVerifyingRef = useRef(false);

  const [otpValue, setOtpValue] = useState('');
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [bannerErrorMessage, setBannerErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownExpiresAt, setCooldownExpiresAt] = useState(
    resolvePersistedCooldownExpiry(cooldownFlowKey, sentAt)
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isEmailParamValid) {
      config.onInvalidEmail(router);
    }
  }, [config, isEmailParamValid, router]);

  useEffect(() => {
    if (!isEmailParamValid) {
      return;
    }

    const nextExpiry = resolvePersistedCooldownExpiry(cooldownFlowKey, sentAt);
    resendCooldownExpiryByFlow.set(cooldownFlowKey, nextExpiry);
    setCooldownExpiresAt(nextExpiry);
    setNow(Date.now());
  }, [cooldownFlowKey, isEmailParamValid, sentAt]);

  useEffect(() => {
    if (cooldownExpiresAt <= Date.now()) {
      return undefined;
    }

    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);

      if (nextNow >= cooldownExpiresAt) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownExpiresAt]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const remainingSeconds = useMemo(
    () => Math.max(0, Math.ceil((cooldownExpiresAt - now) / 1000)),
    [cooldownExpiresAt, now]
  );
  const isOtpComplete = new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otpValue);
  const resendDisabled = loading || remainingSeconds > 0;
  const otpFieldBorderColor = otpErrorMessage
    ? theme.error
    : isOtpFocused
      ? theme.primary
      : otpValue.length > 0
        ? theme.textSecondary
        : theme.border;
  const otpFieldBackgroundColor = loading
    ? theme.backgroundSubtle
    : otpErrorMessage
      ? `${theme.error}14`
      : isOtpFocused
        ? `${theme.primary}14`
        : theme.surfaceElevated;
  const otpFieldBorderWidth = otpErrorMessage || isOtpFocused ? 2 : 1.5;

  const clearFeedback = useCallback(() => {
    setOtpErrorMessage(null);
    setBannerErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    setIsOtpFocused(true);
  }, []);

  const handleVerify = useCallback(
    async (code: string) => {
      if (
        !isEmailParamValid ||
        loading ||
        isVerifyingRef.current ||
        !new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)
      ) {
        return;
      }

      clearFeedback();
      isVerifyingRef.current = true;
      setLoading(true);

      try {
        const result = await config.verify(email, code);

        if (!result.success) {
          if (result.error.code === 'invalid_otp') {
            setOtpErrorMessage(t(config.copy.incorrectCode));
            return;
          }

          if (result.error.code === 'expired_otp') {
            const nextCooldownExpiresAt = Date.now();
            setOtpErrorMessage(t(config.copy.expiredCode));
            resendCooldownExpiryByFlow.set(cooldownFlowKey, nextCooldownExpiresAt);
            setCooldownExpiresAt(nextCooldownExpiresAt);
            setNow(nextCooldownExpiresAt);
            return;
          }

          setBannerErrorMessage(t(config.copy.verifyUnavailable));
          return;
        }

        config.onVerified(router);
      } catch {
        setBannerErrorMessage(t(config.copy.verifyUnavailable));
      } finally {
        isVerifyingRef.current = false;
        setLoading(false);
      }
    },
    [clearFeedback, config, cooldownFlowKey, email, isEmailParamValid, loading, router, t]
  );

  const handleOtpChange = useCallback(
    (value: string) => {
      if (loading) {
        return;
      }

      const sanitized = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      clearFeedback();

      setOtpValue(sanitized);

      if (sanitized.length === OTP_LENGTH) {
        void handleVerify(sanitized);
      }
    },
    [clearFeedback, handleVerify, loading]
  );

  const handleResend = useCallback(async () => {
    if (resendDisabled || !isEmailParamValid) {
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const result = await config.resend(email);

      if (!result.success) {
        setBannerErrorMessage(t(config.copy.resendFailure));
        return;
      }

      const nextCooldownExpiresAt = Date.now() + RESEND_COOLDOWN_MS;
      resendCooldownExpiryByFlow.set(cooldownFlowKey, nextCooldownExpiresAt);
      setOtpValue('');
      setSuccessMessage(t(config.copy.resendSuccess));
      setCooldownExpiresAt(nextCooldownExpiresAt);
      setNow(Date.now());
      focusInput();
    } catch {
      setBannerErrorMessage(t(config.copy.resendFailure));
    } finally {
      setLoading(false);
    }
  }, [
    clearFeedback,
    config,
    cooldownFlowKey,
    email,
    focusInput,
    isEmailParamValid,
    resendDisabled,
    t
  ]);

  if (!isEmailParamValid) {
    return null;
  }

  return (
    <AuthScreenLayout
      testID="verify-email-screen"
      heading={t(config.copy.heading)}
      subtitle={t(config.copy.subtitle, { email })}
      headingTestID="verify-email-title"
      subtitleTestID="verify-email-subtitle"
    >
      <View style={[styles.formGroup, { gap: spacing.md }]}>
        <TextInput
          ref={inputRef}
          testID="otp-input"
          value={otpValue}
          onChangeText={handleOtpChange}
          onFocus={() => setIsOtpFocused(true)}
          onBlur={() => setIsOtpFocused(false)}
          editable={!loading}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={OTP_INPUT_MAX_LENGTH}
          selectTextOnFocus
          placeholder={t('auth.placeholders.verificationCode')}
          placeholderTextColor={theme.textTertiary}
          accessibilityLabel={t('auth.accessibility.verificationCodeLabel')}
          accessibilityHint={t('auth.accessibility.verificationCodeHint')}
          accessibilityState={{ disabled: loading }}
          style={{
            minHeight: 52,
            borderRadius: 12,
            borderWidth: otpFieldBorderWidth,
            borderColor: otpFieldBorderColor,
            backgroundColor: otpFieldBackgroundColor,
            color: theme.textPrimary,
            textAlign: 'center',
            fontSize: 24,
            lineHeight: 32,
            fontWeight: '600',
            letterSpacing: 1.5,
            paddingHorizontal: spacing.md,
            paddingVertical: 0
          }}
        />

        {otpErrorMessage ? <StatusNotice message={otpErrorMessage} tone="error" /> : null}

        <Button
          testID="confirm-code-button"
          variant="primary"
          size="large"
          onPress={() => void handleVerify(otpValue)}
          loading={loading}
          disabled={!isOtpComplete}
          accessibilityLabel={t('auth.accessibility.confirmCode')}
        >
          {t(config.copy.confirm)}
        </Button>

        <Pressable
          testID="resend-code-button"
          onPress={() => void handleResend()}
          disabled={resendDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            resendDisabled
              ? t(config.copy.resendIn, { time: formatCooldown(remainingSeconds) })
              : t(config.copy.resendCode)
          }
          accessibilityState={{ disabled: resendDisabled, busy: loading }}
          style={{
            minHeight: touchTarget.min,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text
            style={{
              color: resendDisabled ? theme.textSecondary : theme.link,
              fontSize: typography.footnote.fontSize,
              lineHeight: typography.footnote.lineHeight,
              fontWeight: '600'
            }}
          >
            {resendDisabled
              ? t(config.copy.resendIn, { time: formatCooldown(remainingSeconds) })
              : t(config.copy.resendCode)}
          </Text>
        </Pressable>

        {successMessage ? <StatusNotice message={successMessage} tone="success" boxed /> : null}
        {bannerErrorMessage ? (
          <ErrorBanner message={bannerErrorMessage} testID="verify-email-banner" />
        ) : null}

        <AuthLink
          testID="wrong-email-link"
          prefixText={t(config.copy.wrongEmail)}
          actionText={t(config.copy.goBack)}
          onPress={() => config.onWrongEmail(router, email)}
          accessibilityLabel={t('auth.accessibility.wrongEmailGoBack')}
        />
      </View>
    </AuthScreenLayout>
  );
};

const styles = StyleSheet.create({
  formGroup: {
    width: '100%'
  },
  noticeBoxed: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12
  },
  noticePlain: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center'
  }
});

export default VerifyEmailScreen;
