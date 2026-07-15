import VerifyEmailScreen from './VerifyEmailScreen';

/**
 * Password-recovery OTP screen (Story 6.19).
 *
 * Structurally binds the shared {@link VerifyEmailScreen} to the `recovery`
 * purpose. Keeping this one-line wrapper in the feature layer lets the
 * `app/recovery-otp` route stay a pure re-export with no props or logic in the
 * routing layer (AD-3 / eslint route-file rule).
 */
const RecoveryOtpScreen = () => <VerifyEmailScreen purpose="recovery" />;

export default RecoveryOtpScreen;
