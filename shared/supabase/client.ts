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
 * iOS Keychain (expo-secure-store) has a ~2KB per-key limit.
 * Supabase session JSON (two JWTs + user metadata) can exceed this.
 * We chunk large values into multiple keys and reassemble on read.
 *
 * Reference: https://docs.expo.dev/versions/latest/sdk/securestore/
 */
const SECURE_STORE_CHUNK_SIZE = 1800; // bytes – safely below the 2048 limit

/**
 * Creates a `SupportedStorage` adapter from an optional SecureStore reference.
 * When `store` is null (web / Jest) all methods are no-ops that resolve to null.
 *
 * Session values that exceed SECURE_STORE_CHUNK_SIZE bytes are transparently
 * split across multiple keyed chunks and reassembled on read.
 *
 * ⚠️ Token values are NEVER logged. Do not add logging to these methods.
 */
export function createSecureStoreAdapter(
  store: typeof import('expo-secure-store') | null
): SupportedStorage {
  return {
    async getItem(key: string): Promise<string | null> {
      if (!store) return null;

      const chunkCountStr = await store.getItemAsync(`${key}.chunks`);

      // Single-chunk (or legacy) value — direct read
      if (chunkCountStr === null) {
        return store.getItemAsync(key);
      }

      const chunkCount = parseInt(chunkCountStr, 10);
      const chunks = await Promise.all(
        Array.from({ length: chunkCount }, (_, i) => store.getItemAsync(`${key}.chunk.${i}`))
      );

      // If any chunk is missing the session is corrupt — treat as absent
      if (chunks.some((c) => c === null)) return null;

      return chunks.join('');
    },

    async setItem(key: string, value: string): Promise<void> {
      if (!store) return;

      if (value.length <= SECURE_STORE_CHUNK_SIZE) {
        // Small value — single key, remove any stale chunks
        await Promise.all([
          store.setItemAsync(key, value),
          store.deleteItemAsync(`${key}.chunks`).catch(() => undefined)
        ]);
        return;
      }

      // Large value — write chunks first, then the count key
      const totalChunks = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE);
      const chunkWrites = Array.from({ length: totalChunks }, (_, i) =>
        store.setItemAsync(
          `${key}.chunk.${i}`,
          value.slice(i * SECURE_STORE_CHUNK_SIZE, (i + 1) * SECURE_STORE_CHUNK_SIZE)
        )
      );
      await Promise.all(chunkWrites);
      await store.setItemAsync(`${key}.chunks`, String(totalChunks));
    },

    async removeItem(key: string): Promise<void> {
      if (!store) return;

      const chunkCountStr = await store.getItemAsync(`${key}.chunks`);

      if (chunkCountStr !== null) {
        const chunkCount = parseInt(chunkCountStr, 10);
        const deletions = Array.from({ length: chunkCount }, (_, i) =>
          store.deleteItemAsync(`${key}.chunk.${i}`).catch(() => undefined)
        );
        await Promise.all([
          ...deletions,
          store.deleteItemAsync(`${key}.chunks`).catch(() => undefined)
        ]);
      } else {
        await store.deleteItemAsync(key).catch(() => undefined);
      }
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

  if (!url.startsWith('https://')) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL must start with "https://" — check your .env file.\n' +
        'Expected format: https://<project-id>.supabase.co'
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
