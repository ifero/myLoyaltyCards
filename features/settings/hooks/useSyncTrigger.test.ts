import { renderHook, act } from '@testing-library/react-native';

import { useSyncTrigger } from './useSyncTrigger';

const mockGetLastSyncAt = jest.fn();
const mockFormatRelativeTime = jest.fn();
const mockTriggerSync = jest.fn();

jest.mock('@/core/sync/sync-timestamp', () => ({
  getLastSyncAt: () => mockGetLastSyncAt()
}));

jest.mock('@/core/utils/relative-time', () => ({
  formatRelativeTime: (value: string | null) => mockFormatRelativeTime(value)
}));

jest.mock('@/shared/hooks/useCloudSync', () => ({
  useCloudSync: () => ({
    triggerSync: () => mockTriggerSync(),
    isSyncing: false
  })
}));

describe('useSyncTrigger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastSyncAt.mockResolvedValue('2026-04-07T10:00:00.000Z');
    mockFormatRelativeTime.mockReturnValue('just now');
  });

  it('loads sync label from timestamp', async () => {
    const { result } = renderHook(() => useSyncTrigger());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.syncLabel).toBe('just now');
  });

  it('triggers sync and refreshes timestamp', async () => {
    const { result } = renderHook(() => useSyncTrigger());

    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockTriggerSync).toHaveBeenCalled();
    expect(mockGetLastSyncAt).toHaveBeenCalled();
  });
});
