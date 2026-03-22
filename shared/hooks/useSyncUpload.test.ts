import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockUploadLocalCards = jest.fn();
const mockForceSyncLocalCards = jest.fn();
const mockGetSession = jest.fn();
const mockUseAuthState = jest.fn();
const mockUpsertCards = jest.fn();

jest.mock('@/core/sync', () => ({
  uploadLocalCards: (...args: unknown[]) => mockUploadLocalCards(...args),
  forceSyncLocalCards: (...args: unknown[]) => mockForceSyncLocalCards(...args)
}));

jest.mock('@/shared/supabase/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args)
}));

jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: (...args: unknown[]) => mockUseAuthState(...args)
}));

jest.mock('@/shared/supabase/cards', () => ({
  upsertCards: (...args: unknown[]) => mockUpsertCards(...args)
}));

import { useSyncUpload } from './useSyncUpload';

beforeEach(() => {
  jest.clearAllMocks();

  mockUseAuthState.mockReturnValue({
    authState: 'guest',
    isAuthenticated: false
  });

  mockGetSession.mockResolvedValue({
    success: true,
    data: {
      user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
      access_token: 'token'
    }
  });

  mockUploadLocalCards.mockResolvedValue({
    success: true,
    uploadedCount: 1,
    failedCount: 0,
    errors: [],
    throttled: false
  });

  mockForceSyncLocalCards.mockResolvedValue({
    success: true,
    uploadedCount: 1,
    failedCount: 0,
    errors: [],
    throttled: false
  });
});

describe('useSyncUpload', () => {
  it('auto-triggers sync on authenticated state', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    renderHook(() => useSyncUpload());

    await waitFor(() => {
      expect(mockUploadLocalCards).toHaveBeenCalledWith(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        expect.any(Function)
      );
    });
  });

  it('sets syncError when sync fails', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockUploadLocalCards.mockResolvedValue({
      success: false,
      uploadedCount: 0,
      failedCount: 1,
      errors: [{ code: 'SYNC_UPLOAD_BATCH_FAILED', message: 'Network down' }],
      throttled: false
    });

    const { result } = renderHook(() => useSyncUpload());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Network down');
    });
  });

  it('triggerSync calls non-forced upload', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    const { result } = renderHook(() => useSyncUpload());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockUploadLocalCards).toHaveBeenCalled();
  });

  it('forceSync calls forced upload path', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'loading',
      isAuthenticated: true
    });

    const { result } = renderHook(() => useSyncUpload());

    await act(async () => {
      await result.current.forceSync();
    });

    expect(mockForceSyncLocalCards).toHaveBeenCalledWith(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      expect.any(Function)
    );
  });

  it('clearSyncError resets sync error state', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockUploadLocalCards.mockResolvedValue({
      success: false,
      uploadedCount: 0,
      failedCount: 1,
      errors: [{ code: 'SYNC_UPLOAD_BATCH_FAILED', message: 'Network down' }],
      throttled: false
    });

    const { result } = renderHook(() => useSyncUpload());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Network down');
    });

    act(() => {
      result.current.clearSyncError();
    });

    expect(result.current.syncError).toBeNull();
  });
});
