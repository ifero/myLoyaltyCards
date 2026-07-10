/**
 * useBootAuthGate Hook
 * Story 16.10: Fix offline cold-start hang
 *
 * Resolves the initial authentication state at boot WITHOUT any blocking
 * network call, so a cold launch with no connectivity never hangs on the
 * loading spinner.
 *
 * Three signals feed the gate:
 *  1. `useAuthState` — the reactive `onAuthStateChange` subscription. Once it
 *     resolves it is the AUTHORITATIVE source (sign-in/out, token refresh). But
 *     when the persisted token is expired, the SDK does a network refresh BEFORE
 *     emitting `INITIAL_SESSION`, which never settles offline — so it cannot be
 *     relied on to resolve boot on its own.
 *  2. `hasPersistedSession()` — a pure SecureStore read (no network, no refresh).
 *     Seeds an optimistic `isAuthenticated` so an offline user with an
 *     expired-but-present session is NOT flashed as a guest / bounced to
 *     `/welcome` while the live listener is still stalled on the refresh.
 *  3. A safety timeout — ultimate backstop: `isReady` flips to guest even if
 *     both signals somehow never resolve. The app can never hang.
 *
 * Replaces the previous `await auth.getSession()` boot gate (app/_layout.tsx),
 * which performed the same network token refresh and hung offline.
 */

import { useEffect, useState } from 'react';

import { hasPersistedSession } from './client';
import { useAuthState } from './useAuthState';

/**
 * Safety net: if neither the auth listener nor the storage probe has resolved
 * within this window, boot as guest rather than hang. Both normally resolve in
 * milliseconds (the storage probe is a local read), so this should never
 * actually elapse in practice.
 */
export const BOOT_AUTH_SAFETY_TIMEOUT_MS = 3000;

type StorageProbe = 'reading' | 'present' | 'absent';

export const useBootAuthGate = (
  safetyTimeoutMs: number = BOOT_AUTH_SAFETY_TIMEOUT_MS
): { isReady: boolean; isAuthenticated: boolean } => {
  const { authState, isAuthenticated: liveIsAuthenticated } = useAuthState();
  const [storageProbe, setStorageProbe] = useState<StorageProbe>('reading');
  const [safetyElapsed, setSafetyElapsed] = useState(false);

  // Offline-safe optimistic probe: does a session exist in SecureStore? Pure
  // storage read — resolves fast even when the SDK's INITIAL_SESSION is stalled
  // on an offline refresh of an expired token.
  useEffect(() => {
    let cancelled = false;
    hasPersistedSession()
      .then((exists) => {
        if (!cancelled) setStorageProbe(exists ? 'present' : 'absent');
      })
      .catch(() => {
        if (!cancelled) setStorageProbe('absent');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSafetyElapsed(true), safetyTimeoutMs);
    return () => clearTimeout(timer);
  }, [safetyTimeoutMs]);

  const authResolved = authState !== 'loading';
  const storageResolved = storageProbe !== 'reading';

  // Ready as soon as we have ANY offline-safe answer: the live auth listener
  // resolving, the storage probe completing, or the safety timeout firing.
  const isReady = authResolved || storageResolved || safetyElapsed;

  // The live auth state is authoritative once known (reactive to sign-in/out
  // and token refresh). Until then, fall back to the optimistic storage probe
  // so a signed-in user is never misclassified as guest offline.
  const isAuthenticated = authResolved ? liveIsAuthenticated : storageProbe === 'present';

  return { isReady, isAuthenticated };
};
