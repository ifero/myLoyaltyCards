import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  NativeSyntheticEvent,
  View
} from 'react-native';

import { isValidEmail } from '@/core/auth/validation';

import { Button } from '@/shared/components/ui';
import { resendVerificationEmail, verifyEmailOtp } from '@/shared/supabase/auth';
import { useTheme } from '@/shared/theme';

import { AuthLink, AuthScreenLayout, ErrorBanner } from './components';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_MS = 60_000;
const VERIFY_UNAVAILABLE_MESSAGE =
  "Couldn't verify right now. Check your connection and try again.";
const RESEND_FAILURE_MESSAGE = "Couldn't resend code. Try again.";
const RESEND_SUCCESS_MESSAGE = 'Code resent. Enter the newest code from your email.';
const resendCooldownExpiryByFlow = new Map<string, number>();

const getSingleParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const buildCooldownFlowKey = (email: string, sentAt: string | undefined) =>
  `${email}::${sentAt ?? 'initial'}`;

const createEmptyDigits = () => Array.from({ length: OTP_LENGTH }, () => '');

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
      className={boxed ? 'w-full flex-row items-start rounded-xl' : 'w-full flex-row items-center'}
      style={{
        justifyContent: boxed ? 'flex-start' : 'center',
        backgroundColor: boxed ? `${color}14` : 'transparent',
        paddingHorizontal: boxed ? spacing.md : 0,
        paddingVertical: boxed ? spacing.sm : 0,
        marginTop: spacing.sm,
        minHeight: boxed ? undefined : spacing.lg
      }}
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

const VerifyEmailScreen = () => {
  const { theme, spacing, typography, touchTarget } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[]; sentAt?: string | string[] }>();

  const email = getSingleParam(params.email) ?? '';
  const sentAt = getSingleParam(params.sentAt);
  const isEmailParamValid = isValidEmail(email);
  const cooldownFlowKey = useMemo(() => buildCooldownFlowKey(email, sentAt), [email, sentAt]);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const isVerifyingRef = useRef(false);

  const [digits, setDigits] = useState<string[]>(createEmptyDigits);
  const [activeIndex, setActiveIndex] = useState(0);
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
      router.replace('/create-account');
    }
  }, [isEmailParamValid, router]);

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
    inputRefs.current[0]?.focus();
  }, []);

  const remainingSeconds = useMemo(
    () => Math.max(0, Math.ceil((cooldownExpiresAt - now) / 1000)),
    [cooldownExpiresAt, now]
  );
  const otpValue = digits.join('');
  const isOtpComplete = /^\d{6}$/.test(otpValue);
  const resendDisabled = loading || remainingSeconds > 0;

  const clearFeedback = useCallback(() => {
    setOtpErrorMessage(null);
    setBannerErrorMessage(null);
    setSuccessMessage(null);
  }, []);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
    setActiveIndex(index);
  }, []);

  const handleVerify = useCallback(
    async (code: string) => {
      if (!isEmailParamValid || loading || isVerifyingRef.current || !/^\d{6}$/.test(code)) {
        return;
      }

      clearFeedback();
      isVerifyingRef.current = true;
      setLoading(true);

      try {
        const result = await verifyEmailOtp(email, code);

        if (!result.success) {
          if (result.error.code === 'invalid_otp') {
            setOtpErrorMessage('Incorrect code. Please try again.');
            return;
          }

          if (result.error.code === 'expired_otp') {
            const nextCooldownExpiresAt = Date.now();
            setOtpErrorMessage('This code has expired. Please request a new one.');
            resendCooldownExpiryByFlow.set(cooldownFlowKey, nextCooldownExpiresAt);
            setCooldownExpiresAt(nextCooldownExpiresAt);
            setNow(nextCooldownExpiresAt);
            return;
          }

          setBannerErrorMessage(VERIFY_UNAVAILABLE_MESSAGE);
          return;
        }

        router.dismissTo('/');
        router.replace('/');
      } catch {
        setBannerErrorMessage(VERIFY_UNAVAILABLE_MESSAGE);
      } finally {
        isVerifyingRef.current = false;
        setLoading(false);
      }
    },
    [clearFeedback, cooldownFlowKey, email, isEmailParamValid, loading, router]
  );

  const commitDigits = useCallback(
    (nextDigits: string[]) => {
      setDigits(nextDigits);
      const nextCode = nextDigits.join('');

      if (/^\d{6}$/.test(nextCode)) {
        void handleVerify(nextCode);
      }
    },
    [handleVerify]
  );

  const handleOtpChange = useCallback(
    (index: number, value: string) => {
      if (loading) {
        return;
      }

      const sanitized = value.replace(/\D/g, '');
      clearFeedback();

      if (!sanitized) {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
        return;
      }

      const nextDigits = [...digits];

      if (sanitized.length === 1) {
        nextDigits[index] = sanitized;

        if (index < OTP_LENGTH - 1) {
          focusInput(index + 1);
        }

        commitDigits(nextDigits);
        return;
      }

      sanitized
        .slice(0, OTP_LENGTH - index)
        .split('')
        .forEach((digit, digitOffset) => {
          nextDigits[index + digitOffset] = digit;
        });

      const lastFilledIndex = Math.min(index + sanitized.length - 1, OTP_LENGTH - 1);
      focusInput(lastFilledIndex);
      commitDigits(nextDigits);
    },
    [clearFeedback, commitDigits, digits, focusInput, loading]
  );

  const handleOtpKeyPress = useCallback(
    (index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (loading || event.nativeEvent.key !== 'Backspace' || digits[index] || index === 0) {
        return;
      }

      clearFeedback();
      const nextDigits = [...digits];
      nextDigits[index - 1] = '';
      setDigits(nextDigits);
      focusInput(index - 1);
    },
    [clearFeedback, digits, focusInput, loading]
  );

  const handleResend = useCallback(async () => {
    if (resendDisabled || !isEmailParamValid) {
      return;
    }

    clearFeedback();
    setLoading(true);

    try {
      const result = await resendVerificationEmail(email);

      if (!result.success) {
        setBannerErrorMessage(RESEND_FAILURE_MESSAGE);
        return;
      }

      const nextCooldownExpiresAt = Date.now() + RESEND_COOLDOWN_MS;
      resendCooldownExpiryByFlow.set(cooldownFlowKey, nextCooldownExpiresAt);
      setDigits(createEmptyDigits());
      setSuccessMessage(RESEND_SUCCESS_MESSAGE);
      setCooldownExpiresAt(nextCooldownExpiresAt);
      setNow(Date.now());
      focusInput(0);
    } catch {
      setBannerErrorMessage(RESEND_FAILURE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [clearFeedback, cooldownFlowKey, email, focusInput, isEmailParamValid, resendDisabled]);

  if (!isEmailParamValid) {
    return null;
  }

  return (
    <AuthScreenLayout
      testID="verify-email-screen"
      heading="Verify your email"
      subtitle={`We sent a 6-digit code to ${email}`}
      headingTestID="verify-email-title"
      subtitleTestID="verify-email-subtitle"
    >
      <View className="w-full" style={{ gap: spacing.md }}>
        <View
          className="w-full flex-row"
          style={{
            gap: spacing.sm,
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {digits.map((digit, index) => {
            const borderColor = otpErrorMessage
              ? theme.error
              : activeIndex === index
                ? theme.primary
                : theme.border;

            return (
              <TextInput
                key={`otp-cell-${index}`}
                ref={(input) => {
                  inputRefs.current[index] = input;
                }}
                testID={`otp-input-${index}`}
                value={digit}
                onChangeText={(value) => handleOtpChange(index, value)}
                onKeyPress={(event) => handleOtpKeyPress(index, event)}
                onFocus={() => setActiveIndex(index)}
                editable={!loading}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                accessibilityLabel={`OTP digit ${index + 1}`}
                accessibilityState={{ disabled: loading }}
                style={{
                  flex: 1,
                  maxWidth: 40,
                  minHeight: 52,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor,
                  backgroundColor: loading ? theme.backgroundSubtle : theme.surfaceElevated,
                  color: theme.textPrimary,
                  textAlign: 'center',
                  fontSize: 28,
                  lineHeight: 32,
                  fontWeight: '600',
                  paddingVertical: 0
                }}
              />
            );
          })}
        </View>

        {otpErrorMessage ? <StatusNotice message={otpErrorMessage} tone="error" /> : null}

        <Button
          testID="confirm-code-button"
          variant="primary"
          size="large"
          onPress={() => void handleVerify(otpValue)}
          loading={loading}
          disabled={!isOtpComplete}
          accessibilityLabel="Confirm"
        >
          Confirm
        </Button>

        <Pressable
          testID="resend-code-button"
          onPress={() => void handleResend()}
          disabled={resendDisabled}
          accessibilityRole="button"
          accessibilityLabel={
            resendDisabled ? `Resend in ${formatCooldown(remainingSeconds)}` : 'Resend code'
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
            {resendDisabled ? `Resend in ${formatCooldown(remainingSeconds)}` : 'Resend code'}
          </Text>
        </Pressable>

        {successMessage ? <StatusNotice message={successMessage} tone="success" boxed /> : null}
        {bannerErrorMessage ? (
          <ErrorBanner message={bannerErrorMessage} testID="verify-email-banner" />
        ) : null}

        <AuthLink
          testID="wrong-email-link"
          prefixText="Wrong email?"
          actionText="Go back"
          onPress={() =>
            router.replace({
              pathname: '/create-account',
              params: { email }
            })
          }
          accessibilityLabel="Wrong email? Go back"
        />
      </View>
    </AuthScreenLayout>
  );
};

export default VerifyEmailScreen;
