const mockGetAllCards = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoyaltyCard } from '@/core/schemas';

import { type CloudFetchSinceFn } from './cloud-sync';
import { CloudCardRow } from './mappers';
import { getLastSyncAt, setLastSyncAt } from './sync-timestamp';
import {
  _SYNC_DIRTY_KEY,
  clearDirty,
  isDirty,
  markDirty,
  processPendingSync,
  type CloudDeleteFn,
  type CloudUpsertFn,
  type PersistMergedCardsFn
} from './sync-trigger';

const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: 'card-1',
  name: 'Test Card',
  barcode: '1234567890',
  barcodeFormat: 'QR',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const makeCloudRow = (overrides: Partial<CloudCardRow> = {}): CloudCardRow => ({
  id: '00000000-0000-4000-8000-000000000001',
  user_id: 'user-123',
  name: 'Cloud Card',
  barcode: '999',
  barcode_format: 'QR',
  brand_id: null,
  color: 'blue',
  is_favorite: false,
  last_used_at: null,
  usage_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// ─── markDirty / isDirty / clearDirty ────────────────────────

describe('markDirty', () => {
  it('sets dirty flag in AsyncStorage', async () => {
    await markDirty();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(_SYNC_DIRTY_KEY, '1');
  });
});

describe('isDirty', () => {
  it('returns true when dirty flag is set', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('1');
    expect(await isDirty()).toBe(true);
  });

  it('returns false when dirty flag is not set', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    expect(await isDirty()).toBe(false);
  });

  it('returns false for unexpected values', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('0');
    expect(await isDirty()).toBe(false);
  });
});

describe('clearDirty', () => {
  it('removes dirty flag from AsyncStorage', async () => {
    await clearDirty();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_SYNC_DIRTY_KEY);
  });
});

// ─── processPendingSync (Delta Pipeline — Story 7.4) ────────

describe('processPendingSync', () => {
  const userId = 'user-123';
  let mockUpsertFn: jest.MockedFunction<CloudUpsertFn>;
  let mockDeleteFn: jest.MockedFunction<CloudDeleteFn>;
  let mockFetchSinceFn: jest.MockedFunction<CloudFetchSinceFn>;
  let mockPersistMergedCardsFn: jest.MockedFunction<PersistMergedCardsFn>;
  let mockGetPendingDeletions: jest.Mock<Promise<string[]>>;
  let mockClearPendingDeletions: jest.Mock<Promise<void>>;

  beforeEach(() => {
    mockUpsertFn = jest.fn().mockResolvedValue({ error: null });
    mockDeleteFn = jest.fn().mockResolvedValue({ error: null });
    mockFetchSinceFn = jest.fn().mockResolvedValue({ data: [], error: null });
    mockPersistMergedCardsFn = jest.fn().mockResolvedValue(undefined);
    mockGetPendingDeletions = jest.fn().mockResolvedValue([]);
    mockClearPendingDeletions = jest.fn().mockResolvedValue(undefined);
    mockGetAllCards.mockResolvedValue([]);
  });

  const callProcess = () =>
    processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockFetchSinceFn,
      mockPersistMergedCardsFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

  it('returns error when userId is invalid and skips cloud operations', async () => {
    const result = await processPendingSync(
      '',
      mockUpsertFn,
      mockDeleteFn,
      mockFetchSinceFn,
      mockPersistMergedCardsFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid user id.');
    expect(mockFetchSinceFn).not.toHaveBeenCalled();
    expect(mockUpsertFn).not.toHaveBeenCalled();
    expect(mockDeleteFn).not.toHaveBeenCalled();
  });

  // ─── First sync (null lastSyncAt → full sync) ──────────

  it('performs full sync when lastSyncAt is null (first sync)', async () => {
    mockGetAllCards.mockResolvedValue([makeCard({ id: 'c1' }), makeCard({ id: 'c2' })]);

    const result = await callProcess();

    // fetchSinceFn called with null → full fetch
    expect(mockFetchSinceFn).toHaveBeenCalledWith(userId, null);
    // All local cards uploaded (full sync fallback)
    expect(mockUpsertFn).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.upsertedCount).toBe(2);
  });

  it('sets lastSyncAt after first successful sync', async () => {
    const result = await callProcess();

    expect(result.success).toBe(true);
    const stored = await getLastSyncAt();
    expect(stored).not.toBeNull();
  });

  // ─── Delta sync (with lastSyncAt) ──────────────────────

  it('passes lastSyncAt to fetchSinceFn for delta download', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');

    await callProcess();

    expect(mockFetchSinceFn).toHaveBeenCalledWith(userId, '2026-03-20T10:00:00.000Z');
  });

  it('delta upload only sends cards changed after lastSyncAt', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');
    const unchanged = makeCard({ id: 'old-card', updatedAt: '2026-03-19T10:00:00.000Z' });
    const changed = makeCard({ id: 'new-card', updatedAt: '2026-03-22T10:00:00.000Z' });
    mockGetAllCards.mockResolvedValue([unchanged, changed]);

    const result = await callProcess();

    expect(result.success).toBe(true);
    expect(result.upsertedCount).toBe(1);
  });

  // ─── Delta download + merge ────────────────────────────

  it('downloads cloud changes and merges with local cards', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');

    const cloudRow = makeCloudRow({
      id: '00000000-0000-4000-8000-000000000099',
      name: 'New Cloud Card',
      updated_at: '2026-03-22T10:00:00.000Z'
    });
    mockFetchSinceFn.mockResolvedValue({ data: [cloudRow], error: null });
    mockGetAllCards.mockResolvedValue([makeCard({ id: 'local-1' })]);

    const result = await callProcess();

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(1);
    expect(mockPersistMergedCardsFn).toHaveBeenCalledTimes(1);
    // Merged should contain both local and cloud card
    const mergedCards = mockPersistMergedCardsFn.mock.calls[0]![0];
    expect(mergedCards).toHaveLength(2);
  });

  it('does not persist when download returns empty results', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');
    mockFetchSinceFn.mockResolvedValue({ data: [], error: null });

    const result = await callProcess();

    expect(result.downloadedCount).toBe(0);
    expect(mockPersistMergedCardsFn).not.toHaveBeenCalled();
  });

  // ─── Deletions unaffected (AC7) ────────────────────────

  it('processes pending deletions (by ID, no timestamp filter)', async () => {
    mockGetPendingDeletions.mockResolvedValue(['del-1', 'del-2']);

    const result = await callProcess();

    expect(mockDeleteFn).toHaveBeenCalledTimes(2);
    expect(mockDeleteFn).toHaveBeenCalledWith('del-1', userId);
    expect(mockDeleteFn).toHaveBeenCalledWith('del-2', userId);
    expect(result.deletedCount).toBe(2);
    expect(result.success).toBe(true);
  });

  // ─── Success path ──────────────────────────────────────

  it('clears dirty flag and deletion queue on success', async () => {
    const result = await callProcess();

    expect(result.success).toBe(true);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_SYNC_DIRTY_KEY);
    expect(mockClearPendingDeletions).toHaveBeenCalledTimes(1);
  });

  it('updates lastSyncAt on success', async () => {
    const before = new Date().toISOString();
    const result = await callProcess();
    const stored = await getLastSyncAt();

    expect(result.success).toBe(true);
    expect(stored).not.toBeNull();
    expect(stored! >= before).toBe(true);
  });

  // ─── Failure paths ─────────────────────────────────────

  it('returns error and does NOT update lastSyncAt on download failure', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');
    mockFetchSinceFn.mockResolvedValue({ data: [], error: 'Network timeout' });

    const result = await callProcess();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Download failed');
    // lastSyncAt unchanged
    const stored = await getLastSyncAt();
    expect(stored).toBe('2026-03-20T10:00:00.000Z');
  });

  it('does not clear dirty/deletions on upsert failure', async () => {
    mockGetAllCards.mockResolvedValue([makeCard()]);
    mockUpsertFn.mockResolvedValue({ error: 'Network error' });

    const result = await callProcess();

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Upsert failed: Network error');
    expect(mockClearPendingDeletions).not.toHaveBeenCalled();
  });

  it('reports successful upsert count even when one upload batch fails', async () => {
    const cards = Array.from({ length: 51 }, (_, index) =>
      makeCard({
        id: `card-${index + 1}`,
        updatedAt: '2026-03-22T10:00:00.000Z'
      })
    );
    mockGetAllCards.mockResolvedValue(cards);
    mockUpsertFn
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: 'batch fail' });

    const result = await callProcess();

    expect(result.success).toBe(false);
    expect(result.upsertedCount).toBe(50);
    expect(result.errors).toContain('Upsert failed: batch fail');
  });

  it('does not clear dirty/deletions on delete failure', async () => {
    mockGetPendingDeletions.mockResolvedValue(['del-1']);
    mockDeleteFn.mockResolvedValue({ error: 'Server 500' });

    const result = await callProcess();

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Delete failed for del-1');
    expect(mockClearPendingDeletions).not.toHaveBeenCalled();
  });

  it('does NOT update lastSyncAt on upsert failure (atomicity)', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');
    mockGetAllCards.mockResolvedValue([makeCard({ updatedAt: '2026-03-22T10:00:00.000Z' })]);
    mockUpsertFn.mockResolvedValue({ error: 'Cloud unavailable' });

    await callProcess();

    const stored = await getLastSyncAt();
    expect(stored).toBe('2026-03-20T10:00:00.000Z');
  });

  // ─── Edge cases ────────────────────────────────────────

  it('skips upsert when no local cards exist', async () => {
    mockGetAllCards.mockResolvedValue([]);

    const result = await callProcess();

    expect(mockUpsertFn).not.toHaveBeenCalled();
    expect(result.upsertedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('skips deletions when queue is empty', async () => {
    mockGetPendingDeletions.mockResolvedValue([]);

    const result = await callProcess();

    expect(mockDeleteFn).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('handles both upload and delete in one call', async () => {
    mockGetAllCards.mockResolvedValue([makeCard({ id: 'c1' })]);
    mockGetPendingDeletions.mockResolvedValue(['del-1']);

    const result = await callProcess();

    expect(result.success).toBe(true);
    expect(result.upsertedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
  });

  it('accumulates errors from both upsert and delete failures', async () => {
    mockGetAllCards.mockResolvedValue([makeCard()]);
    mockUpsertFn.mockResolvedValue({ error: 'Upsert boom' });
    mockGetPendingDeletions.mockResolvedValue(['del-1']);
    mockDeleteFn.mockResolvedValue({ error: 'Delete boom' });

    const result = await callProcess();

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  // ─── Full pipeline integration ─────────────────────────

  it('complete delta cycle: download → merge → upload → delete → timestamp', async () => {
    await setLastSyncAt('2026-03-20T10:00:00.000Z');

    // Cloud has a new card
    const cloudRow = makeCloudRow({
      id: '00000000-0000-4000-8000-000000000099',
      name: 'Cloud New',
      updated_at: '2026-03-22T10:00:00.000Z'
    });
    mockFetchSinceFn.mockResolvedValue({ data: [cloudRow], error: null });

    // Local has a changed card
    const changedCard = makeCard({ id: 'local-changed', updatedAt: '2026-03-21T10:00:00.000Z' });
    mockGetAllCards.mockResolvedValue([changedCard]);

    mockGetPendingDeletions.mockResolvedValue(['del-1']);

    const result = await callProcess();

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(1);
    expect(result.upsertedCount).toBe(1);
    expect(result.deletedCount).toBe(1);

    // lastSyncAt updated
    const updatedTs = await getLastSyncAt();
    expect(updatedTs).not.toBe('2026-03-20T10:00:00.000Z');
  });
});
