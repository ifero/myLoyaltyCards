/**
 * useAuthState Hook
 * Story 6.9: Logout
 *
 * Provides reactive authentication state by subscribing to Supabase's
 * `onAuthStateChange` listener. Returns whether the user is currently
 * authenticated or in guest mode, updating automatically on sign-in/out.
 */

import { useEffect, useState } from 'react';

import { getSupabaseClient } from './client';

export type AuthState = 'authenticated' | 'guest' | 'loading';

/**
 * React hook that returns the current authentication state.
 *
 * - `'loading'` — initial session check in progress
 * - `'authenticated'` — user has an active Supabase session
 * - `'guest'` — no active session (guest mode)
 *
 * The state updates reactively when the user signs in or out.
 */
export const useAuthState = (): { authState: AuthState; isAuthenticated: boolean } => {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch {
      setAuthState('guest');
      return;
    }

    // Subscribe to auth state changes. Supabase fires INITIAL_SESSION
    // synchronously during subscription, which sets the initial state
    // without needing a separate getSession() call.
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? 'authenticated' : 'guest');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    authState,
    isAuthenticated: authState === 'authenticated'
  };
};
