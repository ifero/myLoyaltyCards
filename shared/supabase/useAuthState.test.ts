/**
 * useAuthState Hook Tests
 * Story 6.9: Logout
 *
 * Tests reactive auth state detection via Supabase's onAuthStateChange.
 * The hook relies on onAuthStateChange firing INITIAL_SESSION synchronously
 * during subscription — no separate getSession() call needed.
 */

import { renderHook, act } from '@testing-library/react-native';

import { useAuthState } from './useAuthState';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('./client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange
    }
  }))
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_at: 9999999999,
  user: { id: 'user-123', email: 'test@example.com' }
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthState', () => {
  let authChangeCallback: (event: string, session: unknown) => void;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: callback is stored but NOT called synchronously (simulates no INITIAL_SESSION)
    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );
  });

  it('starts in loading state when INITIAL_SESSION has not fired yet', () => {
    const { result } = renderHook(() => useAuthState());

    expect(result.current.authState).toBe('loading');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('transitions to authenticated when INITIAL_SESSION fires with a session', () => {
    // Simulate Supabase firing INITIAL_SESSION synchronously during subscription
    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        callback('INITIAL_SESSION', MOCK_SESSION);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    const { result } = renderHook(() => useAuthState());

    expect(result.current.authState).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('transitions to guest when INITIAL_SESSION fires with null session', () => {
    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    const { result } = renderHook(() => useAuthState());

    expect(result.current.authState).toBe('guest');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates to guest when onAuthStateChange fires SIGNED_OUT', () => {
    // Start authenticated
    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        callback('INITIAL_SESSION', MOCK_SESSION);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    const { result } = renderHook(() => useAuthState());
    expect(result.current.isAuthenticated).toBe(true);

    // Simulate sign-out event
    act(() => {
      authChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.authState).toBe('guest');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates to authenticated when onAuthStateChange fires SIGNED_IN', () => {
    // Start as guest
    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        callback('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );

    const { result } = renderHook(() => useAuthState());
    expect(result.current.isAuthenticated).toBe(false);

    // Simulate sign-in event
    act(() => {
      authChangeCallback('SIGNED_IN', MOCK_SESSION);
    });

    expect(result.current.authState).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('unsubscribes from auth changes on unmount', () => {
    const { unmount } = renderHook(() => useAuthState());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes to onAuthStateChange on mount', () => {
    renderHook(() => useAuthState());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });
});
