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
function toAuthError(err: unknown): AuthError {
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
}

// ---------------------------------------------------------------------------
// Auth operations
// ---------------------------------------------------------------------------

/**
 * Sign in an existing user with email and password.
 *
 * @returns `AuthResult<AuthSession>` — success contains `user` and `session`.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult<AuthSession>> {
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
}

/**
 * Register a new user with email and password.
 *
 * Supabase may require email confirmation depending on project settings.
 * On success the `session` field may be `null` until the email is confirmed.
 *
 * @returns `AuthResult<{ user: User; session: Session | null }>` — session is
 *   `null` when email confirmation is still pending.
 */
export async function signUp(
  email: string,
  password: string
): Promise<AuthResult<{ user: User; session: Session | null }>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { success: false, error: toAuthError(error) };
    }

    if (!data.user) {
      return {
        success: false,
        error: { message: 'Registration completed but no user was returned. Please try again.' }
      };
    }

    return { success: true, data: { user: data.user, session: data.session } };
  } catch (err) {
    return { success: false, error: toAuthError(err) };
  }
}

/**
 * Sign out the currently authenticated user from this device only.
 *
 * Uses `scope: 'local'` to avoid invalidating sessions on other devices —
 * for a mobile loyalty card app this is the expected UX. If global sign-out
 * is ever needed, pass `scope: 'global'` explicitly at the call site.
 */
export async function signOut(): Promise<AuthResult<void>> {
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
}

/**
 * Retrieve the current active session.
 *
 * Returns `null` session data when there is no authenticated user.
 */
export async function getSession(): Promise<AuthResult<Session | null>> {
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
}

/**
 * Continue without creating an account (guest mode).
 *
 * Returns a local-only guest session. No Supabase API call is made.
 * Guest data is stored locally only and cannot be synced to the cloud
 * until the user creates an account (upgrade path — future story).
 */
export function continueAsGuest(): AuthResult<GuestSession> {
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
}
