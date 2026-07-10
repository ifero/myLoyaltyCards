/**
 * useBootAuthGate Hook Tests
 * Story 16.10: Fix offline cold-start hang
 *
 * Verifies the boot auth gate resolves WITHOUT a network call and can never
 * hang. Critically, it proves the expired-token-offline case the naive
 * `INITIAL_SESSION` approach missed: when the SDK stalls on a network refresh
 * and never emits an auth event, the pure-storage probe still resolves auth
 * (so a signed-in user is not misclassified as guest), and the safety timeout
 * is the ultimate backstop.
 */

import { act, renderHook } from '@testing-library/react-native';

import { BOOT_AUTH_SAFETY_TIMEOUT_MS, useBootAuthGate } from './useBootAuthGate';

// ---------------------------------------------------------------------------
// Mock the client module: onAuthStateChange (reactive) + hasPersistedSession
// (pure storage probe). Neither performs a network call in these tests.
// ---------------------------------------------------------------------------

const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();
const mockGetSupabaseClient = jest.fn(() => ({
  auth: { onAuthStateChange: mockOnAuthStateChange }
}));
const mockHasPersistedSession = jest.fn();

jest.mock('./client', () => ({
  getSupabaseClient: () => mockGetSupabaseClient(),
  hasPersistedSession: () => mockHasPersistedSession()
}));

const MOCK_SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_at: 9999999999,
  user: { id: 'user-123', email: 'test@example.com' }
};

/** Store the auth callback but NEVER fire it — simulates the SDK stalled on an
 * offline token refresh (no INITIAL_SESSION emitted). */
const withStalledListener = () => {
  mockOnAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: mockUnsubscribe } }
  }));
};

/** Fire INITIAL_SESSION synchronously during subscription (valid/absent session). */
let authChangeCallback: (event: string, session: unknown) => void;
const withInitialSession = (session: unknown) => {
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: string, session: unknown) => void) => {
      authChangeCallback = callback;
      callback('INITIAL_SESSION', session);
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }
  );
};

/** Capture the callback without firing it (for later manual events). */
const captureStalledListener = () => {
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: string, session: unknown) => void) => {
      authChangeCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    }
  );
};

/** Flush the async storage-probe promise chain under fake timers. */
const flushProbe = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('useBootAuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetSupabaseClient.mockReturnValue({
      auth: { onAuthStateChange: mockOnAuthStateChange }
    });
    // Default: no persisted session (guest). Overridden per test.
    mockHasPersistedSession.mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is NOT ready while both the auth listener and storage probe are pending (no-flash)', () => {
    withStalledListener();
    mockHasPersistedSession.mockReturnValue(new Promise<boolean>(() => {})); // never resolves

    const { result } = renderHook(() => useBootAuthGate());

    expect(result.current.isReady).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('becomes ready + authenticated from the synchronous INITIAL_SESSION, with no network call (AC1, AC2, AC4)', async () => {
    withInitialSession(MOCK_SESSION);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockHasPersistedSession).toHaveBeenCalledTimes(1);
  });

  it('becomes ready as guest when INITIAL_SESSION has no session (AC1, AC5)', async () => {
    withInitialSession(null);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('seeds isAuthenticated=true from the storage probe when the auth listener is stalled on an offline refresh (expired token) (AC2, AC4)', async () => {
    // The exact gap the naive INITIAL_SESSION approach missed: no auth event
    // fires (SDK stuck on a network refresh), but the storage probe resolves.
    withStalledListener();
    mockHasPersistedSession.mockResolvedValue(true);

    const { result } = renderHook(() => useBootAuthGate());
    expect(result.current.isReady).toBe(false); // still reading

    await flushProbe();

    expect(result.current.isReady).toBe(true); // resolved by the probe, NOT the listener
    expect(result.current.isAuthenticated).toBe(true); // not misclassified as guest
  });

  it('becomes ready as guest from the storage probe when no session is persisted and the listener is stalled', async () => {
    withStalledListener();
    mockHasPersistedSession.mockResolvedValue(false);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('flips to ready (guest default) via the safety timeout if neither signal resolves (AC6)', () => {
    withStalledListener();
    mockHasPersistedSession.mockReturnValue(new Promise<boolean>(() => {})); // never resolves

    const { result } = renderHook(() => useBootAuthGate());
    expect(result.current.isReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(BOOT_AUTH_SAFETY_TIMEOUT_MS);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('lets the live auth state override the optimistic probe once it resolves (AC3 handoff)', async () => {
    // Optimistic probe says signed-in, but the session turns out invalid: once
    // online the SDK emits SIGNED_OUT and the live state must take over.
    captureStalledListener();
    mockHasPersistedSession.mockResolvedValue(true);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();
    expect(result.current.isAuthenticated).toBe(true); // optimistic

    act(() => {
      authChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.isAuthenticated).toBe(false); // authoritative
  });

  it('recovers reactively: guest at boot then authenticated when connectivity returns (AC3)', async () => {
    withInitialSession(null);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      authChangeCallback('SIGNED_IN', MOCK_SESSION);
    });

    expect(result.current.isAuthenticated).toBe(true);
  });

  it('stays authenticated even after the safety window elapses (signed-in users are not bounced) (AC4)', async () => {
    withInitialSession(MOCK_SESSION);

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();

    act(() => {
      jest.advanceTimersByTime(BOOT_AUTH_SAFETY_TIMEOUT_MS * 2);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('boots ready as guest immediately when the Supabase client is unavailable (env misconfig)', async () => {
    mockGetSupabaseClient.mockImplementation(() => {
      throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
    });

    const { result } = renderHook(() => useBootAuthGate());
    await flushProbe();

    expect(result.current.isReady).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears the safety timer and cancels the probe on unmount (no dangling work)', () => {
    withInitialSession(MOCK_SESSION);

    const { unmount } = renderHook(() => useBootAuthGate());
    unmount();

    act(() => {
      jest.advanceTimersByTime(BOOT_AUTH_SAFETY_TIMEOUT_MS);
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
