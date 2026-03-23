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
  forceSyncLocalCards,
  uploadLocalCards,
  type CloudUpsertFn
} from './cloud-sync';

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
