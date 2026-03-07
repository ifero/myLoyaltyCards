/**
 * Guest Session Repository
 * Story 6.5: Implement Guest Mode
 *
 * Manages a persistent guest session UUID stored securely on-device.
 * The guest ID survives app restarts and uniquely identifies this device's
 * local data. It is never transmitted to any cloud service.
 *
 * Storage: expo-secure-store (iOS Keychain / Android Keystore)
 * Fallback: in-memory (web / Jest environments where SecureStore is absent
 *           or unavailable at runtime)
 */

import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GUEST_SESSION_KEY = 'guest_session_id';

// ---------------------------------------------------------------------------
// In-memory fallback (web / Jest / SecureStore unavailable)
// Memoised at module scope so identity is stable within the process lifetime.
// ---------------------------------------------------------------------------

let inMemoryGuestId: string | null = null;

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
 * Falls back to a stable in-memory ID when SecureStore is unavailable
 * (web, Jest, or runtime availability failures).
 */
export const getOrCreateGuestSessionId = async (): Promise<string> => {
  const store = getSecureStore();

  if (store) {
    try {
      const available = await store.isAvailableAsync();
      if (available) {
        const existing = await store.getItemAsync(GUEST_SESSION_KEY);
        if (existing) return existing;

        const newId = uuidv4();
        await store.setItemAsync(GUEST_SESSION_KEY, newId);
        return newId;
      }
    } catch (error) {
      // SecureStore operation failed — fall through to in-memory fallback
      console.warn('SecureStore unavailable for guest session read/write:', error);
    }
  }

  // Fallback: stable in-memory ID (web / Jest / SecureStore unavailable)
  if (!inMemoryGuestId) {
    inMemoryGuestId = uuidv4();
  }
  return inMemoryGuestId;
};

/**
 * Delete the persisted guest session ID.
 *
 * Called during the upgrade-to-account flow so the guest session is
 * replaced by an authenticated Supabase session. Data migration must
 * complete before this is called to avoid data loss.
 * Also clears the in-memory fallback value.
 */
export const clearGuestSessionId = async (): Promise<void> => {
  inMemoryGuestId = null;

  const store = getSecureStore();
  if (store) {
    try {
      const available = await store.isAvailableAsync();
      if (available) {
        await store.deleteItemAsync(GUEST_SESSION_KEY);
      }
    } catch (error) {
      // Best-effort — ignore errors during cleanup
      console.warn('SecureStore unavailable for guest session deletion:', error);
    }
  }
};

/**
 * Reset in-memory fallback ID — for use in tests only.
 * @internal
 */
export const _resetInMemoryGuestIdForTesting = (): void => {
  inMemoryGuestId = null;
};
