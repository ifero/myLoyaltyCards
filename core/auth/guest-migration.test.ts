/**
 * Guest Migration Service Tests
 * Story 6.14: Upgrade Guest to Account
 *
 * Tests the migration of local loyalty cards to the Supabase cloud backend.
 * Validates: success path, partial failure, idempotency, empty cards,
 * migration-already-completed flag, batching, and invalid input.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockIsAvailableAsync = jest.fn();
const mockGetItemAsync = jest.fn();
const mockSetItemAsync = jest.fn();

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: mockIsAvailableAsync,
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync
}));

const mockGetAllCards = jest.fn();
jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid')
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { LoyaltyCard } from '@/core/schemas';

import {
  _BATCH_SIZE,
  _MIGRATION_FLAG_KEY,
  _resetMigrationFlagForTesting,
  CloudUpsertFn,
  isMigrationCompleted,
  migrateGuestCardsToCloud
} from './guest-migration';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-abc-123';

const makeCard = (id: string, name: string): LoyaltyCard => ({
  id,
  name,
  barcode: `barcode-${id}`,
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
});

const CARD_A = makeCard('card-a', 'Store A');
const CARD_B = makeCard('card-b', 'Store B');
const CARD_C = makeCard('card-c', 'Store C');

// ---------------------------------------------------------------------------
// Mock upsert function
// ---------------------------------------------------------------------------

let mockUpsertFn: jest.Mock<ReturnType<CloudUpsertFn>, Parameters<CloudUpsertFn>>;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  _resetMigrationFlagForTesting();

  // Default: SecureStore available, no prior migration flag
  mockIsAvailableAsync.mockResolvedValue(true);
  mockGetItemAsync.mockResolvedValue(null);
  mockSetItemAsync.mockResolvedValue(undefined);

  // Default: upsert succeeds
  mockUpsertFn = jest.fn().mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — success path
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — success path', () => {
  it('migrates 3 cards and returns success with count', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A, CARD_B, CARD_C]);

    const result = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result).toEqual({ success: true, migratedCount: 3 });
  });

  it('calls upsertFn with correct cloud row shape', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockUpsertFn).toHaveBeenCalledWith([
      {
        id: 'card-a',
        user_id: USER_ID,
        name: 'Store A',
        barcode: 'barcode-card-a',
        barcode_format: 'EAN13',
        brand_id: null,
        color: 'blue',
        is_favorite: false,
        last_used_at: null,
        usage_count: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    ]);
  });

  it('sets guestMigrationCompleted flag in SecureStore on success', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      _MIGRATION_FLAG_KEY,
      expect.stringContaining(USER_ID)
    );
  });

  it('flag payload includes completedAt and userId', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    const flagPayload = JSON.parse(mockSetItemAsync.mock.calls[0][1]);
    expect(flagPayload).toHaveProperty('completedAt');
    expect(flagPayload.userId).toBe(USER_ID);
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — empty cards
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — empty cards', () => {
  it('returns success with 0 cards when guest has no local cards', async () => {
    mockGetAllCards.mockResolvedValue([]);

    const result = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result).toEqual({ success: true, migratedCount: 0 });
  });

  it('sets migration flag even when no cards exist', async () => {
    mockGetAllCards.mockResolvedValue([]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockSetItemAsync).toHaveBeenCalledWith(_MIGRATION_FLAG_KEY, expect.any(String));
  });

  it('does not call upsertFn when no cards exist', async () => {
    mockGetAllCards.mockResolvedValue([]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockUpsertFn).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — partial failure
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — partial failure', () => {
  it('returns failure with migratedCount when batch 2 fails', async () => {
    // Create enough cards for 2 batches (BATCH_SIZE + 1)
    const cards = Array.from({ length: _BATCH_SIZE + 1 }, (_, i) =>
      makeCard(`card-${i}`, `Store ${i}`)
    );
    mockGetAllCards.mockResolvedValue(cards);

    // First batch succeeds, second fails
    mockUpsertFn
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: 'Network error' });

    const result = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result).toEqual({
      success: false,
      error: 'Network error',
      migratedCount: _BATCH_SIZE
    });
  });

  it('does NOT set migration flag on partial failure', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A]);
    mockUpsertFn.mockResolvedValue({ error: 'Server error' });

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — complete failure
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — complete failure', () => {
  it('returns failure when first batch fails', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A, CARD_B]);
    mockUpsertFn.mockResolvedValue({ error: 'Unauthorized' });

    const result = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
      migratedCount: 0
    });
  });

  it('returns failure when local DB read throws', async () => {
    mockGetAllCards.mockRejectedValue(new Error('DB corrupted'));

    const result = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result).toEqual({
      success: false,
      error: 'DB corrupted',
      migratedCount: 0
    });
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — idempotency
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — idempotency', () => {
  it('running migration twice upserts same rows without error', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A, CARD_B]);

    const result1 = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);
    const result2 = await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(result1).toEqual({ success: true, migratedCount: 2 });
    expect(result2).toEqual({ success: true, migratedCount: 2 });
    expect(mockUpsertFn).toHaveBeenCalledTimes(2);
  });

  it('upsertFn receives the cloud row array', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockUpsertFn).toHaveBeenCalledWith(expect.any(Array));
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — invalid input
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — invalid input', () => {
  it('returns failure for empty userId', async () => {
    const result = await migrateGuestCardsToCloud('', mockUpsertFn);

    expect(result).toEqual({
      success: false,
      error: 'Invalid user ID.',
      migratedCount: 0
    });
  });

  it('does not read local cards when userId is invalid', async () => {
    await migrateGuestCardsToCloud('', mockUpsertFn);

    expect(mockGetAllCards).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// migrateGuestCardsToCloud — batching
// ---------------------------------------------------------------------------

describe('migrateGuestCardsToCloud — batching', () => {
  it('uploads cards in batches of BATCH_SIZE', async () => {
    const cards = Array.from({ length: _BATCH_SIZE + 10 }, (_, i) =>
      makeCard(`card-${i}`, `Store ${i}`)
    );
    mockGetAllCards.mockResolvedValue(cards);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    // Should be 2 batches: BATCH_SIZE + 10
    expect(mockUpsertFn).toHaveBeenCalledTimes(2);
    expect(mockUpsertFn.mock.calls[0]![0]).toHaveLength(_BATCH_SIZE);
    expect(mockUpsertFn.mock.calls[1]![0]).toHaveLength(10);
  });

  it('uploads single batch when cards <= BATCH_SIZE', async () => {
    mockGetAllCards.mockResolvedValue([CARD_A, CARD_B, CARD_C]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);

    expect(mockUpsertFn).toHaveBeenCalledTimes(1);
    expect(mockUpsertFn.mock.calls[0]![0]).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// isMigrationCompleted
// ---------------------------------------------------------------------------

describe('isMigrationCompleted', () => {
  it('returns false when no flag is stored', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const result = await isMigrationCompleted();

    expect(result).toBe(false);
  });

  it('returns true when flag exists in SecureStore', async () => {
    mockGetItemAsync.mockResolvedValue(JSON.stringify({ completedAt: '2026-01-01', userId: 'x' }));

    const result = await isMigrationCompleted();

    expect(result).toBe(true);
  });

  it('reads from the correct key', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    await isMigrationCompleted();

    expect(mockGetItemAsync).toHaveBeenCalledWith(_MIGRATION_FLAG_KEY);
  });

  it('returns false when SecureStore is unavailable (in-memory fallback)', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const result = await isMigrationCompleted();

    expect(result).toBe(false);
  });

  it('returns true after successful migration (in-memory fallback)', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    mockGetAllCards.mockResolvedValue([CARD_A]);

    await migrateGuestCardsToCloud(USER_ID, mockUpsertFn);
    const result = await isMigrationCompleted();

    expect(result).toBe(true);
  });
});
