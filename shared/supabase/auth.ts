/**
 * Supabase Auth API
 * Story 6-3: Configure App Client for Supabase
 *
 * Exposes typed, error-safe wrappers for all authentication operations.
 * Raw Supabase errors are never surfaced to callers — all methods return
 * a discriminated union `AuthResult<T>`.
 *
 * ⚠️ Never log user credentials or session tokens anywhere in this file.
 */

import type { Session, User } from '@supabase/supabase-js';

import { getConsentStatus, getConsentTimestamp } from '@/core/privacy/consent-repository';
import { logger } from '@/core/utils/logger';

import { getSupabaseClient } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Discriminated union returned by every auth operation */
export type AuthResult<T> = { success: true; data: T } | { success: false; error: AuthError };

export type AuthError = {
  /** Human-readable message safe to display to the user */
  message: string;
  /** Original error code from Supabase (when available) */
  code?: string;
};

export type AuthSession = {
  user: User;
  session: Session;
};

/** Lightweight guest session — no Supabase account, local-only */
export type GuestSession = {
  isGuest: true;
  /** Ephemeral local identifier (not persisted beyond this session) */
  guestId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a Supabase error or unknown thrown value to an `AuthError`.
 * No raw Supabase internals are leaked to callers.
 */
const toAuthError = (err: unknown): AuthError => {
  if (err && typeof err === 'object') {
    // Handles both native Error instances and Supabase error objects { message, code, status }
    const maybeMessage = (err as { message?: unknown }).message;
    const maybeCode = (err as { code?: unknown }).code;
    const message =
      typeof maybeMessage === 'string' && maybeMessage.trim()
        ? maybeMessage
        : 'An unexpected error occurred. Please try again.';
    const code = typeof maybeCode === 'string' ? maybeCode : undefined;
    return { message, code };
  }
  return { message: 'An unexpected error occurred. Please try again.' };
};

/**
 * Normalizes a raw auth error from an OTP verification into a stable,
 * UI-actionable code (`invalid_otp | expired_otp | network_error |
 * unknown_error`). Shared by the signup email-verify (`verifyEmailOtp`,
 * `type: 'email'`) and password-recovery (`verifyPasswordResetOtp`,
 * `type: 'recovery'`) OTP flows — Story 6.19.
 */
const normalizeOtpError = (error: AuthError): AuthError => {
  const code = error.code?.toLowerCase();
  const message = error.message.toLowerCase();

  if (code?.includes('invalid')) {
    return { ...error, code: 'invalid_otp' };
  }

  if (code?.includes('expired') || message.includes('expired')) {
    return { ...error, code: 'expired_otp' };
  }

  if (
    code?.includes('network') ||
    code?.includes('fetch') ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('request failed')
  ) {
    return { ...error, code: 'network_error' };
  }

  if (message.includes('invalid')) {
    return { ...error, code: 'invalid_otp' };
  }

  return { ...error, code: 'unknown_error' };
};

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Sign in an existing user with email and password.
 *
 * @returns `AuthResult<AuthSession>` — success contains `user` and `session`.
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResult<AuthSession>> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: { message: 'Sign-in completed but no session was returned. Please try again.' }
      };
    }

    return { success: true, data: { user: data.user, session: data.session } };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Register a new user with email and password.
 *
 * Supabase may require email confirmation depending on project settings.
 * On success the `session` field may be `null` until the email is confirmed.
 *
 * @returns `AuthResult<{ user: User; session: Session | null }>` — session is
 *   `null` when email confirmation is still pending.
 */
export const signUp = async (
  email: string,
  password: string
): Promise<AuthResult<{ user: User; session: Session | null }>> => {
  try {
    const supabase = getSupabaseClient();
    const consentGiven = getConsentStatus();
    const consentedAt = consentGiven ? (getConsentTimestamp() ?? new Date().toISOString()) : null;
    const signUpPayload = consentGiven
      ? {
          email,
          password,
          options: {
            data: {
              consent_status: true,
              consented_at: consentedAt
            }
          }
        }
      : { email, password };
    const { data, error } = await supabase.auth.signUp(signUpPayload);

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    if (!data.user) {
      return {
        success: false,
        error: { message: 'Registration completed but no user was returned. Please try again.' }
      };
    }

    // Confirmation-required signups return no session, so RLS would reject the
    // client fallback write. In that path the auth.users trigger is authoritative.
    if (!data.session) {
      return { success: true, data: { user: data.user, session: data.session } };
    }

    const profilePayload = {
      id: data.user.id,
      email: data.user.email ?? email,
      created_at: data.user.created_at ?? new Date().toISOString(),
      ...(consentGiven
        ? {
            consent_status: true,
            consented_at: consentedAt
          }
        : {})
    };

    try {
      const { error: profileError } = await supabase
        .from('users')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        logger.warn('[auth] Failed to upsert signup profile:', profileError);
      }
    } catch (profileError) {
      logger.warn('[auth] Failed to upsert signup profile:', profileError);
    }

    return { success: true, data: { user: data.user, session: data.session } };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Verify an email signup OTP and return the authenticated session.
 */
export const verifyEmailOtp = async (
  email: string,
  token: string
): Promise<AuthResult<AuthSession>> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) {
      return { success: false, error: normalizeOtpError(toAuthError(error)) };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: normalizeOtpError({
          message: 'Verification completed but no session was returned. Please try again.'
        })
      };
    }

    return { success: true, data: { user: data.user, session: data.session } };
  } catch (err) {
    return { success: false, error: normalizeOtpError(toAuthError(err)) };
  }
};

/**
 * Resend the signup verification email OTP.
 */
export const resendVerificationEmail = async (email: string): Promise<AuthResult<void>> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Sign out the currently authenticated user from this device only.
 *
 * Uses `scope: 'local'` to avoid invalidating sessions on other devices —
 * for a mobile loyalty card app this is the expected UX. If global sign-out
 * is ever needed, pass `scope: 'global'` explicitly at the call site.
 */
export const signOut = async (): Promise<AuthResult<void>> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Retrieve the current active session.
 *
 * Returns `null` session data when there is no authenticated user.
 */
export const getSession = async (): Promise<AuthResult<Session | null>> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    return { success: true, data: data.session };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Send a password-recovery one-time code to the given email (Story 6.19).
 *
 * Calls `resetPasswordForEmail` WITHOUT a `redirectTo` — with a `{{ .Token }}`
 * recovery email template this delivers a numeric OTP instead of a deep link,
 * so no redirect allowlist is involved. Like every reset entry point, success
 * is returned regardless of whether the email is registered (no user
 * enumeration); only transport errors (network, rate limit) surface.
 */
export const sendPasswordResetOtp = async (email: string): Promise<AuthResult<void>> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Verify a password-recovery OTP and return the recovery session (Story 6.19).
 *
 * Mirrors `verifyEmailOtp` but with `type: 'recovery'`; the returned session
 * authorizes the subsequent `updatePassword` call. Errors are normalized to the
 * shared OTP codes via `normalizeOtpError`.
 */
export const verifyPasswordResetOtp = async (
  email: string,
  token: string
): Promise<AuthResult<AuthSession>> => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery'
    });

    if (error) {
      return { success: false, error: normalizeOtpError(toAuthError(error)) };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: normalizeOtpError({
          message: 'Verification completed but no session was returned. Please try again.'
        })
      };
    }

    return { success: true, data: { user: data.user, session: data.session } };
  } catch (err) {
    return { success: false, error: normalizeOtpError(toAuthError(err)) };
  }
};

/**
 * Update the current user's password.
 *
 * Called once a recovery session is active — for password reset that is the
 * session returned by `verifyPasswordResetOtp` (Story 6.19). Also used by an
 * already-authenticated user changing their own password.
 *
 * @param newPassword - The new password to set.
 */
export const updatePassword = async (newPassword: string): Promise<AuthResult<void>> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Permanently delete the authenticated user's cloud account and all
 * associated data (GDPR right to erasure).
 *
 * Calls the `delete-account` Supabase Edge Function which uses the
 * service-role key to invoke `auth.admin.deleteUser()`. ON DELETE CASCADE
 * in the DB schema handles removal of loyalty_cards, users profile, and
 * privacy_log rows.
 *
 * On success the local Supabase session is cleared via `signOut()`.
 * Local SQLite cards are intentionally preserved — the user continues
 * in guest mode.
 *
 * @returns `AuthResult<void>` — success means the account was fully erased.
 */
export const deleteAccount = async (): Promise<AuthResult<void>> => {
  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { success: false, error: toAuthError(sessionError) };
    }

    if (!session) {
      return { success: false, error: { message: 'Not authenticated' } };
    }

    const { error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    // Clear local session after successful server-side deletion
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) {
      return { success: false, error: toAuthError(signOutError) };
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
};

/**
 * Continue without creating an account (guest mode).
 *
 * Returns a local-only guest session. No Supabase API call is made.
 * Guest data is stored locally only and cannot be synced to the cloud
 * until the user creates an account (upgrade path — future story).
 */
export const continueAsGuest = (): AuthResult<GuestSession> => {
  // Math.random() is intentional here — guestId is ephemeral UI state only,
  // not used for security or persistence. Cryptographic randomness is not needed.
  const guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    success: true,
    data: {
      isGuest: true,
      guestId
    }
  };
};
