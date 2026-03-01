/**
 * Supabase Client Initialization Tests
 * Story 6-1: Create Supabase Project & Environments
 *
 * Tests environment variable validation and client creation
 */

describe('Supabase Client Initialization', () => {
  const ORIGINAL_ENV = process.env;
  const importClient = () => import('./client');

  beforeEach(() => {
    // Reset modules to allow re-importing with different env vars
    jest.resetModules();
    // Create a fresh copy of env vars
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    // Restore original env vars
    process.env = ORIGINAL_ENV;
  });

  it('should throw clear error when EXPO_PUBLIC_SUPABASE_URL is missing', async () => {
    // Remove the URL env var
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';

    await expect(importClient()).rejects.toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });

  it('should throw clear error when EXPO_PUBLIC_SUPABASE_KEY is missing', async () => {
    // Remove the KEY env var
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    await expect(importClient()).rejects.toThrow('Missing EXPO_PUBLIC_SUPABASE_KEY');
  });

  it('should throw clear error when both env vars are missing', async () => {
    // Remove both env vars
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    await expect(importClient()).rejects.toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });

  it('should include setup instructions in error message for missing URL', async () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';

    await expect(importClient()).rejects.toThrow('.env.example');
    await expect(importClient()).rejects.toThrow('manual-supabase-steps-6-1.md');
  });

  it('should include setup instructions in error message for missing KEY', async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;

    await expect(importClient()).rejects.toThrow('.env.example');
    await expect(importClient()).rejects.toThrow('manual-supabase-steps-6-1.md');
  });

  it('should create client successfully with valid env vars', async () => {
    // Set valid env vars
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';

    // Import should succeed
    const { supabase } = await importClient();

    // Client should be defined
    expect(supabase).toBeDefined();
    expect(supabase).toHaveProperty('auth');
    expect(supabase).toHaveProperty('from');
  });

  it('should handle empty string env vars as missing', async () => {
    // Set empty strings
    process.env.EXPO_PUBLIC_SUPABASE_URL = '';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';

    await expect(importClient()).rejects.toThrow('Missing EXPO_PUBLIC_SUPABASE_URL');
  });
});
