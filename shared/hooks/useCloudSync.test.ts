import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockUploadLocalCards = jest.fn();
const mockForceSyncLocalCards = jest.fn();
const mockDownloadCloudCards = jest.fn();
const mockGetSession = jest.fn();
const mockUseAuthState = jest.fn();
const mockUpsertCards = jest.fn();
const mockFetchCards = jest.fn();
const mockBatchUpsertCards = jest.fn();

jest.mock('@/core/sync', () => ({
  uploadLocalCards: (...args: unknown[]) => mockUploadLocalCards(...args),
  forceSyncLocalCards: (...args: unknown[]) => mockForceSyncLocalCards(...args),
  downloadCloudCards: (...args: unknown[]) => mockDownloadCloudCards(...args)
}));

jest.mock('@/core/database/card-repository', () => ({
  batchUpsertCards: (...args: unknown[]) => mockBatchUpsertCards(...args)
}));

jest.mock('@/shared/supabase/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args)
}));

jest.mock('@/shared/supabase/useAuthState', () => ({
  useAuthState: (...args: unknown[]) => mockUseAuthState(...args)
}));

jest.mock('@/shared/supabase/cards', () => ({
  upsertCards: (...args: unknown[]) => mockUpsertCards(...args),
  fetchCards: (...args: unknown[]) => mockFetchCards(...args)
}));

import { useCloudSync } from './useCloudSync';

const MOCK_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const successDownload = {
  success: true,
  downloadedCount: 2,
  mergeResult: {
    merged: [{ id: '1' }, { id: '2' }],
    added: 2,
    updated: 0,
    unchanged: 0,
    skipped: 0
  },
  errors: [],
  throttled: false
};

const successUpload = {
  success: true,
  uploadedCount: 1,
  failedCount: 0,
  errors: [],
  throttled: false
};

beforeEach(() => {
  jest.clearAllMocks();

  mockUseAuthState.mockReturnValue({
    authState: 'guest',
    isAuthenticated: false
  });

  mockGetSession.mockResolvedValue({
    success: true,
    data: {
      user: { id: MOCK_USER_ID },
      access_token: 'token'
    }
  });

  mockDownloadCloudCards.mockResolvedValue(successDownload);
  mockUploadLocalCards.mockResolvedValue(successUpload);
  mockForceSyncLocalCards.mockResolvedValue(successUpload);
  mockBatchUpsertCards.mockResolvedValue(undefined);
});

describe('useCloudSync', () => {
  it('auto-triggers sync on authenticated state', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
      expect(mockUploadLocalCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
    });
  });

  it('persists merged cards to local DB after download', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(mockBatchUpsertCards).toHaveBeenCalledWith(successDownload.mergeResult.merged);
    });
  });

  it('sets downloadedCount from merge result', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.downloadedCount).toBe(2);
    });
  });

  it('sets syncError when download fails', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockDownloadCloudCards.mockResolvedValue({
      success: false,
      downloadedCount: 0,
      mergeResult: null,
      errors: [{ code: 'SYNC_DOWNLOAD_FETCH_FAILED', message: 'Network timeout' }],
      throttled: false
    });

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Network timeout');
    });

    // Upload should NOT be called when download fails
    expect(mockUploadLocalCards).not.toHaveBeenCalled();
  });

  it('sets syncError when upload fails', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockUploadLocalCards.mockResolvedValue({
      success: false,
      uploadedCount: 0,
      failedCount: 1,
      errors: [{ code: 'SYNC_UPLOAD_BATCH_FAILED', message: 'Upload failed' }],
      throttled: false
    });

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Upload failed');
    });
  });

  it('skips DB persist when throttled', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockDownloadCloudCards.mockResolvedValue({
      success: true,
      downloadedCount: 0,
      mergeResult: null,
      errors: [],
      throttled: true
    });

    renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(mockDownloadCloudCards).toHaveBeenCalled();
    });

    expect(mockBatchUpsertCards).not.toHaveBeenCalled();
  });

  it('forceSync calls forced download and upload paths', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'loading',
      isAuthenticated: true
    });

    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.forceSync();
    });

    expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function), {
      forceSync: true
    });
    expect(mockForceSyncLocalCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
  });

  it('triggerSync calls non-forced download and upload paths', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockDownloadCloudCards).toHaveBeenCalledWith(MOCK_USER_ID, expect.any(Function));
    expect(mockUploadLocalCards).toHaveBeenCalled();
  });

  it('clearSyncError resets sync error state', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockDownloadCloudCards.mockResolvedValue({
      success: false,
      downloadedCount: 0,
      mergeResult: null,
      errors: [{ code: 'FAIL', message: 'Error' }],
      throttled: false
    });

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Error');
    });

    act(() => {
      result.current.clearSyncError();
    });

    expect(result.current.syncError).toBeNull();
  });

  it('sets generic error when session retrieval fails', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockGetSession.mockResolvedValue({
      success: false,
      error: { message: 'Session expired' }
    });

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Session expired');
    });
  });

  it('handles unexpected error gracefully', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'authenticated',
      isAuthenticated: true
    });

    mockDownloadCloudCards.mockRejectedValue(new Error('unexpected'));

    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.syncError).toBe('Cloud sync failed. Pull to retry.');
    });
  });

  it('does not run sync when not authenticated', async () => {
    mockUseAuthState.mockReturnValue({
      authState: 'guest',
      isAuthenticated: false
    });

    const { result } = renderHook(() => useCloudSync());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockGetSession).not.toHaveBeenCalled();
    expect(mockDownloadCloudCards).not.toHaveBeenCalled();
  });
});
