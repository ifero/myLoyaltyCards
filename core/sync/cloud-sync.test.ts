const mockGetAllCards = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LoyaltyCard } from '@/core/schemas';

import {
  _BATCH_SIZE,
  _CLOUD_SYNC_COOLDOWN_MS,
  _LAST_CLOUD_SYNC_KEY,
  downloadCloudCards,
  forceSyncLocalCards,
  mergeCards,
  uploadLocalCards,
  type CloudFetchFn,
  type CloudUpsertFn
} from './cloud-sync';
import { CloudCardRow } from './mappers';

const makeCard = (index: number): LoyaltyCard => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  name: `Store ${index}`,
  barcode: `barcode-${index}`,
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-03-21T10:30:00.123Z',
  updatedAt: '2026-03-21T10:30:00.123Z'
});

let upsert: jest.Mock<ReturnType<CloudUpsertFn>, Parameters<CloudUpsertFn>>;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  upsert = jest.fn().mockResolvedValue({ error: null });
  mockGetAllCards.mockResolvedValue([]);
});

describe('uploadLocalCards', () => {
  it('returns error on invalid user id', async () => {
    const result = await uploadLocalCards('', upsert);

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('SYNC_INVALID_USER');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('uploads cards in a single batch', async () => {
    mockGetAllCards.mockResolvedValue([makeCard(1), makeCard(2)]);

    const result = await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      forceSync: true
    });

    expect(result).toEqual({
      success: true,
      uploadedCount: 2,
      failedCount: 0,
      errors: [],
      throttled: false
    });
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('uploads cards in batches of 50', async () => {
    const cards = Array.from({ length: _BATCH_SIZE + 1 }, (_, index) => makeCard(index));
    mockGetAllCards.mockResolvedValue(cards);

    const result = await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0]?.[0]).toHaveLength(_BATCH_SIZE);
    expect(upsert.mock.calls[1]?.[0]).toHaveLength(1);
  });

  it('continues uploading when a batch fails', async () => {
    const cards = Array.from({ length: _BATCH_SIZE * 2 }, (_, index) => makeCard(index));
    mockGetAllCards.mockResolvedValue(cards);

    upsert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: 'Network down' });

    const result = await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      forceSync: true
    });

    expect(result.success).toBe(false);
    expect(result.uploadedCount).toBe(_BATCH_SIZE);
    expect(result.failedCount).toBe(_BATCH_SIZE);
    expect(result.errors[0]?.code).toBe('SYNC_UPLOAD_BATCH_FAILED');
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it('skips sync when last sync is inside cooldown window', async () => {
    const now = 1_000_000;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      String(now - _CLOUD_SYNC_COOLDOWN_MS + 1000)
    );

    const result = await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      now: () => now
    });

    expect(result).toEqual({
      success: true,
      uploadedCount: 0,
      failedCount: 0,
      errors: [],
      throttled: true
    });
    expect(mockGetAllCards).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('persists last sync timestamp on successful sync', async () => {
    mockGetAllCards.mockResolvedValue([makeCard(1)]);

    await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      now: () => 1234,
      forceSync: true
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(_LAST_CLOUD_SYNC_KEY, '1234');
  });

  it('forceSync bypasses throttle', async () => {
    const now = 1_000_000;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(String(now - 1000));
    mockGetAllCards.mockResolvedValue([makeCard(1)]);

    const result = await forceSyncLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      now: () => now
    });

    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('returns success with zero uploads when local cards are empty', async () => {
    mockGetAllCards.mockResolvedValue([]);

    const result = await uploadLocalCards('11111111-1111-4111-8111-111111111111', upsert, {
      forceSync: true,
      now: () => 42
    });

    expect(result).toEqual({
      success: true,
      uploadedCount: 0,
      failedCount: 0,
      errors: [],
      throttled: false
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(_LAST_CLOUD_SYNC_KEY, '42');
  });
});

// ===================================================================
// mergeCards (Story 7.2)
// ===================================================================

describe('mergeCards', () => {
  it('returns empty result for empty local + empty cloud', () => {
    const result = mergeCards([], []);

    expect(result.merged).toEqual([]);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
  });

  it('keeps all local cards when cloud is empty', () => {
    const locals = [makeCard(1), makeCard(2), makeCard(3)];
    const result = mergeCards(locals, []);

    expect(result.merged).toHaveLength(3);
    expect(result.unchanged).toBe(3);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('adds all cloud cards when local is empty', () => {
    const cloud = [makeCard(1), makeCard(2)];
    const result = mergeCards([], cloud);

    expect(result.merged).toHaveLength(2);
    expect(result.added).toBe(2);
    expect(result.unchanged).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('keeps cloud card when cloud is newer (partial overlap)', () => {
    const localCard = {
      ...makeCard(1),
      name: 'Old Local',
      updatedAt: '2026-03-20T10:00:00.000Z'
    };
    const cloudCard = {
      ...makeCard(1),
      name: 'Updated Cloud',
      updatedAt: '2026-03-21T10:00:00.000Z'
    };

    const result = mergeCards([localCard], [cloudCard]);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.name).toBe('Updated Cloud');
    expect(result.updated).toBe(1);
  });

  it('keeps local card when local is newer', () => {
    const localCard = {
      ...makeCard(1),
      name: 'Newer Local',
      updatedAt: '2026-03-22T10:00:00.000Z'
    };
    const cloudCard = {
      ...makeCard(1),
      name: 'Older Cloud',
      updatedAt: '2026-03-20T10:00:00.000Z'
    };

    const result = mergeCards([localCard], [cloudCard]);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.name).toBe('Newer Local');
    expect(result.unchanged).toBe(1);
  });

  it('cloud wins on identical updatedAt (deterministic tiebreak)', () => {
    const timestamp = '2026-03-21T10:00:00.000Z';
    const localCard = { ...makeCard(1), name: 'Local', updatedAt: timestamp };
    const cloudCard = { ...makeCard(1), name: 'Cloud', updatedAt: timestamp };

    const result = mergeCards([localCard], [cloudCard]);

    expect(result.merged[0]?.name).toBe('Cloud');
    expect(result.unchanged).toBe(1); // same timestamp = unchanged
    expect(result.updated).toBe(0);
  });

  it('handles full overlap with identical cards as unchanged', () => {
    const cards = [makeCard(1), makeCard(2), makeCard(3)];
    const result = mergeCards(cards, cards);

    expect(result.merged).toHaveLength(3);
    expect(result.unchanged).toBe(3);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
  });

  it('handles mixed scenario: cloud-only + local-only + overlap', () => {
    const localOnly = { ...makeCard(10), updatedAt: '2026-03-21T10:00:00.000Z' };
    const shared = { ...makeCard(5), updatedAt: '2026-03-20T10:00:00.000Z' };
    const cloudOnly = { ...makeCard(20), updatedAt: '2026-03-21T10:00:00.000Z' };
    const sharedCloudNewer = {
      ...makeCard(5),
      name: 'Cloud Updated',
      updatedAt: '2026-03-22T10:00:00.000Z'
    };

    const result = mergeCards([localOnly, shared], [cloudOnly, sharedCloudNewer]);

    expect(result.merged).toHaveLength(3);
    expect(result.added).toBe(1); // cloudOnly
    expect(result.updated).toBe(1); // shared → cloud newer
    expect(result.unchanged).toBe(1); // localOnly
  });

  it('does not lose any cards during merge', () => {
    const locals = Array.from({ length: 5 }, (_, i) => makeCard(i));
    const cloud = Array.from({ length: 5 }, (_, i) => makeCard(i + 3)); // overlap at 3,4

    const result = mergeCards(locals, cloud);

    // 5 local + 5 cloud - 2 overlap = 8 unique cards
    expect(result.merged).toHaveLength(8);
  });
});

// ===================================================================
// downloadCloudCards (Story 7.2)
// ===================================================================

const makeCloudRow = (index: number): CloudCardRow => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: `Store ${index}`,
  barcode: `barcode-${index}`,
  barcode_format: 'EAN13',
  brand_id: null,
  color: 'blue',
  is_favorite: false,
  last_used_at: null,
  usage_count: 0,
  created_at: '2026-03-21T10:30:00.123Z',
  updated_at: '2026-03-21T10:30:00.123Z'
});

let fetchFn: jest.Mock<ReturnType<CloudFetchFn>, Parameters<CloudFetchFn>>;

describe('downloadCloudCards', () => {
  beforeEach(() => {
    fetchFn = jest.fn().mockResolvedValue({ data: [], error: null });
  });

  it('returns error on invalid userId', async () => {
    const result = await downloadCloudCards('', fetchFn);

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('SYNC_INVALID_USER');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('downloads and merges cloud cards (happy path)', async () => {
    fetchFn.mockResolvedValue({
      data: [makeCloudRow(1), makeCloudRow(2)],
      error: null
    });
    mockGetAllCards.mockResolvedValue([]);

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(2);
    expect(result.mergeResult?.added).toBe(2);
    expect(result.mergeResult?.merged).toHaveLength(2);
  });

  it('returns empty merge when cloud has no cards', async () => {
    fetchFn.mockResolvedValue({ data: [], error: null });
    mockGetAllCards.mockResolvedValue([makeCard(1)]);

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(0);
    expect(result.mergeResult?.unchanged).toBe(1);
    expect(result.mergeResult?.added).toBe(0);
  });

  it('returns error on fetch failure', async () => {
    fetchFn.mockResolvedValue({ data: [], error: 'Network timeout' });

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(false);
    expect(result.errors[0]?.code).toBe('SYNC_DOWNLOAD_FETCH_FAILED');
    expect(result.mergeResult).toBeNull();
  });

  it('skips invalid cloud rows and continues', async () => {
    const validRow = makeCloudRow(1);
    const invalidRow = { ...makeCloudRow(2), id: 'not-a-uuid' };
    fetchFn.mockResolvedValue({
      data: [validRow, invalidRow],
      error: null
    });
    mockGetAllCards.mockResolvedValue([]);

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(1);
    expect(result.mergeResult?.skipped).toBe(1);
    expect(result.mergeResult?.added).toBe(1);
  });

  it('respects throttle when not forced', async () => {
    const now = 1_000_000;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      String(now - _CLOUD_SYNC_COOLDOWN_MS + 1000)
    );

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      now: () => now
    });

    expect(result.throttled).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('forceSync bypasses throttle', async () => {
    const now = 1_000_000;
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(String(now - 1000));
    fetchFn.mockResolvedValue({ data: [makeCloudRow(1)], error: null });
    mockGetAllCards.mockResolvedValue([]);

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(result.downloadedCount).toBe(1);
  });

  it('merges correctly when cloud and local have overlapping cards', async () => {
    const cloudRow = {
      ...makeCloudRow(1),
      name: 'Cloud Name',
      updated_at: '2026-03-23T10:00:00.000Z'
    };
    fetchFn.mockResolvedValue({ data: [cloudRow], error: null });

    const localCard = {
      ...makeCard(1),
      name: 'Local Name',
      updatedAt: '2026-03-20T10:00:00.000Z'
    };
    mockGetAllCards.mockResolvedValue([localCard]);

    const result = await downloadCloudCards('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fetchFn, {
      forceSync: true
    });

    expect(result.success).toBe(true);
    expect(result.mergeResult?.merged[0]?.name).toBe('Cloud Name');
    expect(result.mergeResult?.updated).toBe(1);
  });
});
