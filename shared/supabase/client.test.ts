/**
 * Supabase Client Initialization Tests
 * Story 6-1: Create Supabase Project & Environments
 *
 * Tests environment variable validation and client creation
 */
import { createSupabaseClient, getSupabaseCredentials } from './client';

describe('Supabase Client Initialization', () => {
  it('should throw clear error when EXPO_PUBLIC_SUPABASE_URL is missing', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
    };

    expect(() => getSupabaseCredentials(env)).toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });

  it('should throw clear error when EXPO_PUBLIC_SUPABASE_KEY is missing', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
    };

    expect(() => getSupabaseCredentials(env)).toThrow('Missing EXPO_PUBLIC_SUPABASE_KEY');
  });

  it('should throw clear error when both env vars are missing', () => {
    const env = {};

    expect(() => getSupabaseCredentials(env)).toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });

  it('should include setup instructions in error message for missing URL', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
    };

    expect(() => getSupabaseCredentials(env)).toThrow('.env.example');
    expect(() => getSupabaseCredentials(env)).toThrow('manual-supabase-steps-6-1.md');
  });

  it('should include setup instructions in error message for missing KEY', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co'
    };

    expect(() => getSupabaseCredentials(env)).toThrow('.env.example');
    expect(() => getSupabaseCredentials(env)).toThrow('manual-supabase-steps-6-1.md');
  });

  it('should create client successfully with valid env vars', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
    };

    const supabase = createSupabaseClient(env);

    // Client should be defined
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });

  it('should handle empty string env vars as missing', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_URL: '',
      EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
    };

    expect(() => getSupabaseCredentials(env)).toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });
});
