import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Client for Cloud Storage and Authentication
 * Story 6-1: Create Supabase Project & Environments
 *
 * Environment Variables Required:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_KEY: Your Supabase anon/public key
 *
 * Note: EXPO_PUBLIC_ prefix is required for Expo to expose env vars to client code.
 */

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

export function createSupabaseClient(env: SupabaseEnv = getRuntimeSupabaseEnv()) {
  const { url, key } = getSupabaseCredentials(env);
  return createClient(url, key);
}

let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }

  return supabaseInstance;
}
