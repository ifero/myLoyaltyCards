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
  getSessionStorageKey,
  getSupabaseClient,
  getSupabaseCredentials,
  hasPersistedSession,
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

  it('should throw clear error when EXPO_PUBLIC_SUPABASE_URL is not https', () => {
    const env = {
      EXPO_PUBLIC_SUPABASE_URL: 'http://test.supabase.co',
      EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
    };

    expect(() => getSupabaseCredentials(env)).toThrow(
      'EXPO_PUBLIC_SUPABASE_URL must start with "https://"'
    );
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
    // When no chunks key exists, falls through to direct single-key read
    mockGetItemAsync.mockImplementation(async (k: string) => {
      if (k === 'test-key.chunks') return null; // no chunks — single key
      if (k === 'test-key') return 'stored-value';
      return null;
    });

    const result = await adapter.getItem('test-key');

    expect(mockGetItemAsync).toHaveBeenCalledWith('test-key.chunks');
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
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await adapter.setItem('supabase-session', 'token-value');

    expect(mockSetItemAsync).toHaveBeenCalledWith('supabase-session', 'token-value');
  });

  it('setItem chunks large values (> 1800 bytes) across multiple keys', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);
    const largeValue = 'x'.repeat(3600); // exactly 2 chunks of 1800 bytes each

    await adapter.setItem('big-session', largeValue);

    // Chunk keys should be written
    expect(mockSetItemAsync).toHaveBeenCalledWith('big-session.chunk.0', expect.any(String));
    expect(mockSetItemAsync).toHaveBeenCalledWith('big-session.chunk.1', expect.any(String));
    // Count key written last
    expect(mockSetItemAsync).toHaveBeenCalledWith('big-session.chunks', '2');
    // Raw key must NOT be written for chunked values
    expect(mockSetItemAsync).not.toHaveBeenCalledWith('big-session', largeValue);
  });

  it('getItem reassembles chunked value correctly', async () => {
    const chunk0 = 'a'.repeat(1800);
    const chunk1 = 'b'.repeat(200);

    mockGetItemAsync.mockImplementation(async (k: string) => {
      if (k === 'big-session.chunks') return '2';
      if (k === 'big-session.chunk.0') return chunk0;
      if (k === 'big-session.chunk.1') return chunk1;
      return null;
    });

    const result = await adapter.getItem('big-session');

    expect(result).toBe(chunk0 + chunk1);
  });

  it('removeItem deletes all chunk keys when chunks key is present', async () => {
    mockGetItemAsync.mockImplementation(async (k: string) => {
      if (k === 'multi-key.chunks') return '2';
      return null;
    });
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await adapter.removeItem('multi-key');

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('multi-key.chunk.0');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('multi-key.chunk.1');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('multi-key.chunks');
  });

  it('getItem returns null when the chunks count key is corrupt (isNaN guard)', async () => {
    mockGetItemAsync.mockImplementation(async (k: string) => {
      if (k === 'bad-session.chunks') return 'not-a-number'; // corrupt key
      return null;
    });

    const result = await adapter.getItem('bad-session');

    expect(result).toBeNull();
  });

  it('removeItem degrades gracefully when the chunks count key is corrupt', async () => {
    mockGetItemAsync.mockImplementation(async (k: string) => {
      if (k === 'bad-key.chunks') return 'not-a-number';
      return null;
    });
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await expect(adapter.removeItem('bad-key')).resolves.toBeUndefined();
    // Should still attempt to delete the corrupt count key
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('bad-key.chunks');
  });

  it('removeItem delegates to SecureStore.deleteItemAsync (non-chunked key)', async () => {
    // No chunks key → falls through to direct delete
    mockGetItemAsync.mockResolvedValue(null);
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

// ---------------------------------------------------------------------------
// Persisted-session probe (boot auth gate — Story 16.10)
// ---------------------------------------------------------------------------

describe('getSessionStorageKey', () => {
  it('derives sb-<ref>-auth-token from the Supabase URL (matches supabase-js default)', () => {
    expect(getSessionStorageKey('https://abcdefgh.supabase.co')).toBe('sb-abcdefgh-auth-token');
  });
});

describe('hasPersistedSession', () => {
  const validEnv = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefgh.supabase.co',
    EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
  };

  const makeStorage = (value: string | null) => ({
    getItem: jest.fn().mockResolvedValue(value),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined)
  });

  it('returns true when a session with an access_token is persisted', async () => {
    const storage = makeStorage(JSON.stringify({ access_token: 'jwt', user: { id: 'u1' } }));
    await expect(hasPersistedSession(validEnv, storage)).resolves.toBe(true);
  });

  it('reads from the supabase-js default key with no network round-trip', async () => {
    const storage = makeStorage(JSON.stringify({ access_token: 'jwt' }));
    await hasPersistedSession(validEnv, storage);
    expect(storage.getItem).toHaveBeenCalledWith('sb-abcdefgh-auth-token');
  });

  it('returns true for an EXPIRED-but-present session (past expiry) without any refresh', async () => {
    // The crux of Story 16.10: an expired token must still read as "signed in"
    // from storage alone — never a network refresh (which hangs offline).
    const storage = makeStorage(JSON.stringify({ access_token: 'jwt', expires_at: 1 }));
    await expect(hasPersistedSession(validEnv, storage)).resolves.toBe(true);
  });

  it('returns false when no session is persisted', async () => {
    const storage = makeStorage(null);
    await expect(hasPersistedSession(validEnv, storage)).resolves.toBe(false);
  });

  it('returns false when the stored value has no access_token', async () => {
    const storage = makeStorage(JSON.stringify({ foo: 'bar' }));
    await expect(hasPersistedSession(validEnv, storage)).resolves.toBe(false);
  });

  it('returns false (never throws) on corrupt JSON', async () => {
    const storage = makeStorage('{not valid json');
    await expect(hasPersistedSession(validEnv, storage)).resolves.toBe(false);
  });

  it('returns false (never throws) when env is missing, without touching storage', async () => {
    const storage = makeStorage(JSON.stringify({ access_token: 'jwt' }));
    await expect(hasPersistedSession({}, storage)).resolves.toBe(false);
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('reads a CHUNKED (>1800 byte) session end-to-end through the real SecureStore adapter (AC2)', async () => {
    // Integration: the probe must work against the ACTUAL chunk-splitting
    // adapter, not just a flat mock. A large multi-JWT session exceeds the
    // 1800-byte SecureStore chunk size and is stored across multiple keys —
    // the probe has to reassemble it exactly as the SDK's own reads would.
    const map = new Map<string, string>();
    const store = {
      getItemAsync: jest.fn(async (k: string) => (map.has(k) ? map.get(k)! : null)),
      setItemAsync: jest.fn(async (k: string, v: string) => {
        map.set(k, v);
      }),
      deleteItemAsync: jest.fn(async (k: string) => {
        map.delete(k);
      })
    } as unknown as typeof import('expo-secure-store');
    const adapter = createSecureStoreAdapter(store);
    const key = getSessionStorageKey(validEnv.EXPO_PUBLIC_SUPABASE_URL);

    const largeSession = JSON.stringify({
      access_token: 'a'.repeat(2000),
      refresh_token: 'r'.repeat(2000),
      user: { id: 'u1' }
    });
    await adapter.setItem(key, largeSession);

    // Sanity: the value really was chunked (a `.chunks` count key was written).
    expect(store.setItemAsync).toHaveBeenCalledWith(`${key}.chunks`, expect.any(String));

    await expect(hasPersistedSession(validEnv, adapter)).resolves.toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Singleton caching behaviour (Story 6-3)
// ---------------------------------------------------------------------------

describe('getSupabaseClient — singleton caching', () => {
  const validEnv = {
    EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    EXPO_PUBLIC_SUPABASE_KEY: 'test-key'
  };

  beforeEach(() => {
    resetSupabaseClientForTesting();
    // Override env so createSupabaseClient succeeds inside getSupabaseClient
    process.env.EXPO_PUBLIC_SUPABASE_URL = validEnv.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_KEY = validEnv.EXPO_PUBLIC_SUPABASE_KEY;
  });

  afterEach(() => {
    resetSupabaseClientForTesting();
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_KEY;
  });

  it('returns the same instance on repeated calls', () => {
    const a = getSupabaseClient();
    const b = getSupabaseClient();
    expect(a).toBe(b);
  });

  it('resetSupabaseClientForTesting causes a new instance to be created', () => {
    const a = getSupabaseClient();
    resetSupabaseClientForTesting();
    const b = getSupabaseClient();
    expect(a).not.toBe(b);
  });
});
