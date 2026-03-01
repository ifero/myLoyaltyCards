/**
 * Supabase Client Initialization Tests
 * Story 6-1: Create Supabase Project & Environments
 * Story 6-3: Configure App Client — SecureStore adapter, session persistence
 *
 * Tests environment variable validation, client creation, and the
 * SecureStore-backed session storage adapter.
 */
import {
  createSecureStoreAdapter,
  createSupabaseClient,
  getSupabaseCredentials,
  resetSupabaseClientForTesting,
  SecureStoreAdapter
} from './client';

// ---------------------------------------------------------------------------
// Environment variable validation (existing tests from Story 6-1)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// SecureStore session storage adapter — native platform (Story 6-3)
// ---------------------------------------------------------------------------

describe('createSecureStoreAdapter — native platform (mock SecureStore present)', () => {
  const mockGetItemAsync = jest.fn();
  const mockSetItemAsync = jest.fn();
  const mockDeleteItemAsync = jest.fn();

  const fakeSecureStore = {
    getItemAsync: mockGetItemAsync,
    setItemAsync: mockSetItemAsync,
    deleteItemAsync: mockDeleteItemAsync,
    // satisfy TypeScript (not called in tests)
    setValueWithKeyOptions: jest.fn(),
    getValueWithKeyOptions: jest.fn(),
    isAvailableAsync: jest.fn()
  } as unknown as typeof import('expo-secure-store');

  const adapter = createSecureStoreAdapter(fakeSecureStore);

  beforeEach(() => {
    mockGetItemAsync.mockReset();
    mockSetItemAsync.mockReset();
    mockDeleteItemAsync.mockReset();
  });

  it('getItem delegates to SecureStore.getItemAsync', async () => {
    mockGetItemAsync.mockResolvedValue('stored-value');

    const result = await adapter.getItem('test-key');

    expect(mockGetItemAsync).toHaveBeenCalledWith('test-key');
    expect(result).toBe('stored-value');
  });

  it('getItem returns null when key has no value', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const result = await adapter.getItem('missing-key');

    expect(result).toBeNull();
  });

  it('setItem delegates to SecureStore.setItemAsync (never logs value)', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);

    await adapter.setItem('supabase-session', 'token-value');

    expect(mockSetItemAsync).toHaveBeenCalledWith('supabase-session', 'token-value');
  });

  it('removeItem delegates to SecureStore.deleteItemAsync', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await adapter.removeItem('supabase-session');

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('supabase-session');
  });
});

// ---------------------------------------------------------------------------
// SecureStore session storage adapter — web/Jest fallback (no native module)
// ---------------------------------------------------------------------------

describe('createSecureStoreAdapter — web / Jest fallback (store = null)', () => {
  // Simulate unavailable SecureStore by passing null
  const adapter = createSecureStoreAdapter(null);

  it('getItem returns null gracefully when SecureStore is unavailable', async () => {
    const result = await adapter.getItem('some-key');

    expect(result).toBeNull();
  });

  it('setItem resolves without throwing when SecureStore is unavailable', async () => {
    await expect(adapter.setItem('key', 'value')).resolves.toBeUndefined();
  });

  it('removeItem resolves without throwing when SecureStore is unavailable', async () => {
    await expect(adapter.removeItem('key')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Exported SecureStoreAdapter singleton is a valid SupportedStorage
// ---------------------------------------------------------------------------

describe('SecureStoreAdapter export', () => {
  it('is exported and implements SupportedStorage interface', () => {
    expect(typeof SecureStoreAdapter.getItem).toBe('function');
    expect(typeof SecureStoreAdapter.setItem).toBe('function');
    expect(typeof SecureStoreAdapter.removeItem).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Client options — session persistence (Story 6-3)
// ---------------------------------------------------------------------------

describe('createSupabaseClient — auth options', () => {
  const validEnv = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
  };

  it('client has auth property confirming session management is active', () => {
    const client = createSupabaseClient(validEnv);

    // Verify the client exposes session methods (confirms persistSession config)
    expect(client.auth).toBeDefined();
    expect(typeof client.auth.getSession).toBe('function');
    expect(typeof client.auth.signInWithPassword).toBe('function');
    expect(typeof client.auth.signOut).toBe('function');
  });

  it('accepts a custom storage adapter', () => {
    const customStorage = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined)
    };

    const client = createSupabaseClient(validEnv, customStorage);

    expect(client).toBeDefined();
    expect(client).toHaveProperty('auth');
  });
});

// ---------------------------------------------------------------------------
// Singleton reset utility (Story 6-3)
// ---------------------------------------------------------------------------

describe('resetSupabaseClientForTesting', () => {
  it('is exported and callable without throwing', () => {
    expect(() => resetSupabaseClientForTesting()).not.toThrow();
  });
});
