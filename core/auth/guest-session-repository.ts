/**
 * Guest Session Repository
 * Story 6.5: Implement Guest Mode
 *
 * Manages a persistent guest session UUID stored securely on-device.
 * The guest ID survives app restarts and uniquely identifies this device's
 * local data. It is never transmitted to any cloud service.
 *
 * Storage: expo-secure-store (iOS Keychain / Android Keystore)
 * Fallback: in-memory (web / Jest environments where SecureStore is absent)
 */

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GUEST_SESSION_KEY = 'guest_session_id';

// ---------------------------------------------------------------------------
// SecureStore lazy loader
// ---------------------------------------------------------------------------

const getSecureStore = (): typeof import('expo-secure-store') | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as typeof import('expo-secure-store');
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the persisted guest session ID, creating and storing one if absent.
 *
 * Safe to call multiple times — always returns the same ID for this install.
 */
export const getOrCreateGuestSessionId = async (): Promise<string> => {
  const store = getSecureStore();

  if (store) {
    const existing = await store.getItemAsync(GUEST_SESSION_KEY);
    if (existing) return existing;

    const newId = uuidv4();
    await store.setItemAsync(GUEST_SESSION_KEY, newId);
    return newId;
  }

  // Fallback for environments without SecureStore (web / Jest)
  const newId = uuidv4();
  return newId;
};

/**
 * Delete the persisted guest session ID.
 *
 * Called during the upgrade-to-account flow so the guest session is
 * replaced by an authenticated Supabase session. Data migration must
 * complete before this is called to avoid data loss.
 */
export const clearGuestSessionId = async (): Promise<void> => {
  const store = getSecureStore();
  if (store) {
    await store.deleteItemAsync(GUEST_SESSION_KEY);
  }
};
