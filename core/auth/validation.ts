/**
 * Auth Validation Utilities
 * Story 6-8: Password Reset (extracted to eliminate duplication)
 *
 * Shared validation helpers used by all auth screens:
 * - SignInScreen, CreateAccountScreen, ForgotPasswordScreen, ResetPasswordScreen
 */

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

/** Loose RFC-5322-ish check — covers the practical 99 % of valid addresses. */
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

/**
 * Password must be at least 8 characters, contain at least one letter and
 * one digit. Matches the story acceptance criteria exactly (Story 6-6).
 */
export const isValidPassword = (pw: string): boolean => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pw);
