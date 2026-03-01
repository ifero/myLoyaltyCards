import { createClient, SupportedStorage } from '@supabase/supabase-js';

/**
 * Supabase Client for Cloud Storage and Authentication
 * Story 6-1: Create Supabase Project & Environments
 * Story 6-3: Configure App Client (SecureStore session adapter)
 *
 * Environment Variables Required:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_KEY: Your Supabase anon/public key
 *
 * Note: EXPO_PUBLIC_ prefix is required for Expo to expose env vars to client code.
 */

// ---------------------------------------------------------------------------
// SecureStore session storage adapter
// ---------------------------------------------------------------------------

/**
 * Lazy-loaded SecureStore reference. Resolved at runtime to avoid import
 * errors in web/Jest where the native module is absent.
 */
function getSecureStore(): typeof import('expo-secure-store') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as typeof import('expo-secure-store');
  } catch {
    return null;
  }
}

/**
 * Creates a `SupportedStorage` adapter from an optional SecureStore reference.
 * When `store` is null (web / Jest) all methods are no-ops that resolve to null.
 *
 * ⚠️ Token values are NEVER logged. Do not add logging to these methods.
 */
export function createSecureStoreAdapter(
  store: typeof import('expo-secure-store') | null
): SupportedStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      if (!store) return null;
      return store.getItemAsync(key);
    },

    async setItem(key: string, value: string): Promise<void> {
      if (!store) return;
      await store.setItemAsync(key, value);
    },

    async removeItem(key: string): Promise<void> {
      if (!store) return;
      await store.deleteItemAsync(key);
    }
  };
}

/**
 * Adapter implementing Supabase's `SupportedStorage` interface backed by
 * expo-secure-store on native platforms. Falls back gracefully to a noop
 * on web / Jest environments where SecureStore is unavailable.
 */
export const SecureStoreAdapter: SupportedStorage = createSecureStoreAdapter(getSecureStore());

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

type SupabaseEnv = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_KEY?: string;
};

function getRuntimeSupabaseEnv(): SupabaseEnv {
  return {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY
  };
}

export function getSupabaseCredentials(env: SupabaseEnv = getRuntimeSupabaseEnv()): {
  url: string;
  key: string;
} {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!url) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable.\n' +
        'Please copy .env.example to .env and add your Supabase project URL.\n' +
        'See docs/sprint-artifacts/manual-supabase-steps-6-1.md for setup instructions.'
    );
  }

  if (!key) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_KEY environment variable.\n' +
        'Please copy .env.example to .env and add your Supabase anon key.\n' +
        'See docs/sprint-artifacts/manual-supabase-steps-6-1.md for setup instructions.'
    );
  }

  return { url, key };
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

export function createSupabaseClient(
  env: SupabaseEnv = getRuntimeSupabaseEnv(),
  storage: SupportedStorage = SecureStoreAdapter
) {
  const { url, key } = getSupabaseCredentials(env);
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // Not applicable on mobile
      storage
    }
  });
}

// ---------------------------------------------------------------------------
// Singleton accessor (lazy-initialised)
// ---------------------------------------------------------------------------

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }

  return supabaseInstance;
}

/** Reset singleton — only for use in tests */
export function resetSupabaseClientForTesting() {
  supabaseInstance = null;
}
