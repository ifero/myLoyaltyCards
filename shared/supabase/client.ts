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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL environment variable.\n' +
      'Please copy .env.example to .env and add your Supabase project URL.\n' +
      'See docs/sprint-artifacts/manual-supabase-steps-6-1.md for setup instructions.'
  );
}

if (!SUPABASE_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_KEY environment variable.\n' +
      'Please copy .env.example to .env and add your Supabase anon key.\n' +
      'See docs/sprint-artifacts/manual-supabase-steps-6-1.md for setup instructions.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
