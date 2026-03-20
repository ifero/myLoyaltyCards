/**
 * useGuestMigration Hook Tests
 * Story 6.14: Upgrade Guest to Account
 *
 * Tests the migration hook lifecycle: auto-trigger, status transitions,
 * retry, dismiss, and auto-dismiss.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsMigrationCompleted = jest.fn();
const mockMigrateGuestCardsToCloud = jest.fn();

jest.mock('@/core/auth/guest-migration', () => ({
  isMigrationCompleted: (...args: unknown[]) => mockIsMigrationCompleted(...args),
  migrateGuestCardsToCloud: (...args: unknown[]) => mockMigrateGuestCardsToCloud(...args)
}));

const mockGetSession = jest.fn();

jest.mock('@/shared/supabase/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args)
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useGuestMigration, SUCCESS_BANNER_DELAY } from '../useGuestMigration';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123';

const MOCK_SESSION_RESULT = {
  success: true,
  data: {
    user: { id: USER_ID },
    access_token: 'token'
  }
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Default: no session (guest mode) — prevents auto-trigger
  mockGetSession.mockResolvedValue({ success: true, data: null });
  mockIsMigrationCompleted.mockResolvedValue(false);
  mockMigrateGuestCardsToCloud.mockResolvedValue({ success: true, migratedCount: 3 });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('useGuestMigration — initial state', () => {
  it('starts in idle status with no message', () => {
    const { result } = renderHook(() => useGuestMigration());

    expect(result.current.status).toBe('idle');
    expect(result.current.message).toBeNull();
    expect(result.current.migratedCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Manual trigger
// ---------------------------------------------------------------------------

describe('useGuestMigration — manual trigger', () => {
  it('transitions to success after successful migration', async () => {
    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });

    expect(result.current.status).toBe('success');
    expect(result.current.message).toContain('safe');
    expect(result.current.migratedCount).toBe(3);
  });

  it('transitions to error on failed migration', async () => {
    mockMigrateGuestCardsToCloud.mockResolvedValue({
      success: false,
      error: 'Network error',
      migratedCount: 1
    });

    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.message).toContain('retry');
    expect(result.current.migratedCount).toBe(1);
  });

  it('skips migration when already completed', async () => {
    mockIsMigrationCompleted.mockResolvedValue(true);

    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });

    expect(result.current.status).toBe('idle');
    expect(mockMigrateGuestCardsToCloud).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Auto-trigger via getSession
// ---------------------------------------------------------------------------

describe('useGuestMigration — auto-trigger', () => {
  it('auto-triggers migration when user is authenticated', async () => {
    mockGetSession.mockResolvedValue(MOCK_SESSION_RESULT);

    const { result } = renderHook(() => useGuestMigration());

    await waitFor(() => {
      expect(result.current.status).toBe('success');
    });

    expect(mockMigrateGuestCardsToCloud).toHaveBeenCalledWith(USER_ID, expect.any(Function));
  });

  it('does not auto-trigger when user is guest (no session)', async () => {
    mockGetSession.mockResolvedValue({ success: true, data: null });

    renderHook(() => useGuestMigration());

    // Let async effects settle
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMigrateGuestCardsToCloud).not.toHaveBeenCalled();
  });

  it('does not auto-trigger when getSession fails', async () => {
    mockGetSession.mockResolvedValue({ success: false, error: { message: 'fail' } });

    renderHook(() => useGuestMigration());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMigrateGuestCardsToCloud).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

describe('useGuestMigration — retry', () => {
  it('retries migration with the same userId', async () => {
    mockMigrateGuestCardsToCloud
      .mockResolvedValueOnce({ success: false, error: 'Network error', migratedCount: 0 })
      .mockResolvedValueOnce({ success: true, migratedCount: 3 });

    const { result } = renderHook(() => useGuestMigration());

    // First attempt fails
    await act(async () => {
      await result.current.trigger(USER_ID);
    });
    expect(result.current.status).toBe('error');

    // Retry succeeds
    mockIsMigrationCompleted.mockResolvedValue(false);
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.status).toBe('success');
  });

  it('retry does nothing when no userId was set', async () => {
    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.retry();
    });

    expect(mockMigrateGuestCardsToCloud).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Dismiss
// ---------------------------------------------------------------------------

describe('useGuestMigration — dismiss', () => {
  it('dismiss resets status to idle', async () => {
    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });
    expect(result.current.status).toBe('success');

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.message).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss
// ---------------------------------------------------------------------------

describe('useGuestMigration — auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('auto-dismisses success banner after SUCCESS_BANNER_DELAY', async () => {
    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });
    expect(result.current.status).toBe('success');

    act(() => {
      jest.advanceTimersByTime(SUCCESS_BANNER_DELAY);
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.message).toBeNull();
  });

  it('does not auto-dismiss error state', async () => {
    mockMigrateGuestCardsToCloud.mockResolvedValue({
      success: false,
      error: 'fail',
      migratedCount: 0
    });

    const { result } = renderHook(() => useGuestMigration());

    await act(async () => {
      await result.current.trigger(USER_ID);
    });
    expect(result.current.status).toBe('error');

    act(() => {
      jest.advanceTimersByTime(SUCCESS_BANNER_DELAY * 2);
    });

    // Still error — not auto-dismissed
    expect(result.current.status).toBe('error');
  });
});
