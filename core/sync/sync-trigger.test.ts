const mockGetAllCards = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoyaltyCard } from '@/core/schemas';

import {
  _SYNC_DIRTY_KEY,
  clearDirty,
  isDirty,
  markDirty,
  processPendingSync,
  type CloudDeleteFn,
  type CloudUpsertFn
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

beforeEach(() => {
  jest.clearAllMocks();
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
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    expect(await isDirty()).toBe(true);
  });

  it('returns false when dirty flag is not set', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await isDirty()).toBe(false);
  });

  it('returns false for unexpected values', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('0');
    expect(await isDirty()).toBe(false);
  });
});

describe('clearDirty', () => {
  it('removes dirty flag from AsyncStorage', async () => {
    await clearDirty();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_SYNC_DIRTY_KEY);
  });
});

// ─── processPendingSync ──────────────────────────────────────

describe('processPendingSync', () => {
  const userId = 'user-123';
  let mockUpsertFn: jest.MockedFunction<CloudUpsertFn>;
  let mockDeleteFn: jest.MockedFunction<CloudDeleteFn>;
  let mockGetPendingDeletions: jest.Mock<Promise<string[]>>;
  let mockClearPendingDeletions: jest.Mock<Promise<void>>;

  beforeEach(() => {
    mockUpsertFn = jest.fn().mockResolvedValue({ error: null });
    mockDeleteFn = jest.fn().mockResolvedValue({ error: null });
    mockGetPendingDeletions = jest.fn().mockResolvedValue([]);
    mockClearPendingDeletions = jest.fn().mockResolvedValue(undefined);
    mockGetAllCards.mockResolvedValue([]);
  });

  it('upserts all local cards to cloud', async () => {
    const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
    mockGetAllCards.mockResolvedValue(cards);

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(mockUpsertFn).toHaveBeenCalledTimes(1);
    expect(mockUpsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'c1', user_id: userId }),
        expect.objectContaining({ id: 'c2', user_id: userId })
      ])
    );
    expect(result.success).toBe(true);
    expect(result.upsertedCount).toBe(2);
  });

  it('processes pending deletions', async () => {
    mockGetPendingDeletions.mockResolvedValue(['del-1', 'del-2']);

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(mockDeleteFn).toHaveBeenCalledTimes(2);
    expect(mockDeleteFn).toHaveBeenCalledWith('del-1', userId);
    expect(mockDeleteFn).toHaveBeenCalledWith('del-2', userId);
    expect(result.deletedCount).toBe(2);
    expect(result.success).toBe(true);
  });

  it('clears dirty flag and deletion queue on success', async () => {
    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(true);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(_SYNC_DIRTY_KEY);
    expect(mockClearPendingDeletions).toHaveBeenCalledTimes(1);
  });

  it('does not clear dirty/deletions on upsert failure', async () => {
    mockGetAllCards.mockResolvedValue([makeCard()]);
    mockUpsertFn.mockResolvedValue({ error: 'Network error' });

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Upsert failed: Network error');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith(_SYNC_DIRTY_KEY);
    expect(mockClearPendingDeletions).not.toHaveBeenCalled();
  });

  it('does not clear dirty/deletions on delete failure', async () => {
    mockGetPendingDeletions.mockResolvedValue(['del-1']);
    mockDeleteFn.mockResolvedValue({ error: 'Server 500' });

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Delete failed for del-1');
    expect(mockClearPendingDeletions).not.toHaveBeenCalled();
  });

  it('skips upsert when no local cards exist', async () => {
    mockGetAllCards.mockResolvedValue([]);

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(mockUpsertFn).not.toHaveBeenCalled();
    expect(result.upsertedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('skips deletions when queue is empty', async () => {
    mockGetPendingDeletions.mockResolvedValue([]);

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(mockDeleteFn).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('handles both upsert and delete in one call', async () => {
    mockGetAllCards.mockResolvedValue([makeCard({ id: 'c1' })]);
    mockGetPendingDeletions.mockResolvedValue(['del-1']);

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(true);
    expect(result.upsertedCount).toBe(1);
    expect(result.deletedCount).toBe(1);
  });

  it('accumulates errors from both upsert and delete failures', async () => {
    mockGetAllCards.mockResolvedValue([makeCard()]);
    mockUpsertFn.mockResolvedValue({ error: 'Upsert boom' });
    mockGetPendingDeletions.mockResolvedValue(['del-1']);
    mockDeleteFn.mockResolvedValue({ error: 'Delete boom' });

    const result = await processPendingSync(
      userId,
      mockUpsertFn,
      mockDeleteFn,
      mockGetPendingDeletions,
      mockClearPendingDeletions
    );

    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
