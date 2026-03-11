/**
 * useAuthState Hook Tests
 * Story 6.9: Logout
 *
 * Tests reactive auth state detection via Supabase's onAuthStateChange.
 */

import { renderHook, act } from '@testing-library/react-native';

import { useAuthState } from './useAuthState';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('./client', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
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

    mockOnAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authChangeCallback = callback;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }
    );
  });

  it('starts in loading state', () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useAuthState());

    expect(result.current.authState).toBe('loading');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('transitions to authenticated when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });

    const { result } = renderHook(() => useAuthState());

    // Wait for the async getSession to resolve
    await act(async () => {});

    expect(result.current.authState).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('transitions to guest when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuthState());

    await act(async () => {});

    expect(result.current.authState).toBe('guest');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates to guest when onAuthStateChange fires with null session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: MOCK_SESSION } });

    const { result } = renderHook(() => useAuthState());

    await act(async () => {});
    expect(result.current.isAuthenticated).toBe(true);

    // Simulate sign-out event
    act(() => {
      authChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.authState).toBe('guest');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('updates to authenticated when onAuthStateChange fires with a session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuthState());

    await act(async () => {});
    expect(result.current.isAuthenticated).toBe(false);

    // Simulate sign-in event
    act(() => {
      authChangeCallback('SIGNED_IN', MOCK_SESSION);
    });

    expect(result.current.authState).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('unsubscribes from auth changes on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { unmount } = renderHook(() => useAuthState());

    await act(async () => {});

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes to onAuthStateChange on mount', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    renderHook(() => useAuthState());

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });
});
