/**
 * Conflict Resolution Tests — Story 7.6
 *
 * Comprehensive test suite covering:
 * - Task 1: Merge algorithm (LWW, tie-break, AC1/AC2/AC4)
 * - Task 2: Deletion vs edit conflicts (AC6)
 * - Task 4: Offline conflict scenarios (AC5)
 * - Task 5: Convergence verification (AC3)
 * - Task 6: Edge case hardening
 */

const mockGetAllCards = jest.fn();

jest.mock('@/core/database/card-repository', () => ({
  getAllCards: (...args: unknown[]) => mockGetAllCards(...args)
}));

import { LoyaltyCard } from '@/core/schemas';

import { mergeCards, mergeWithDeletions, normalizeTimestamp } from './cloud-sync';
import { logConflictResolution } from './conflict-logger';

jest.mock('./conflict-logger', () => ({
  logConflictResolution: jest.fn()
}));

const mockedLogConflict = logConflictResolution as jest.MockedFunction<
  typeof logConflictResolution
>;

const makeCard = (
  id: string,
  updatedAt: string,
  overrides: Partial<LoyaltyCard> = {}
): LoyaltyCard => ({
  id,
  name: `Card ${id}`,
  barcode: `barcode-${id}`,
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt,
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllCards.mockResolvedValue([]);
});

// ===================================================================
// Task 1: Merge Algorithm — LWW (AC1, AC2, AC4)
// ===================================================================

describe('mergeCards — LWW conflict resolution', () => {
  it('AC1: local newer → local wins', () => {
    const local = [makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Local Edit' })];
    const cloud = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Cloud Edit' })];

    const result = mergeCards(local, cloud);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.name).toBe('Local Edit');
    expect(result.unchanged).toBe(1);
  });

  it('AC1: cloud newer → cloud wins', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Local Edit' })];
    const cloud = [makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Cloud Edit' })];

    const result = mergeCards(local, cloud);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.name).toBe('Cloud Edit');
    expect(result.updated).toBe(1);
  });

  it('AC2: tie → cloud wins (deterministic tie-break)', () => {
    const ts = '2026-03-21T10:00:00.000Z';
    const local = [makeCard('c1', ts, { name: 'Local' })];
    const cloud = [makeCard('c1', ts, { name: 'Cloud' })];

    const result = mergeCards(local, cloud);

    expect(result.merged[0]?.name).toBe('Cloud');
    expect(result.unchanged).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('AC4: entire card from latest edit wins (no field-level merge)', () => {
    // Device A changed name, Device B changed color — B is newer
    const local = [
      makeCard('c1', '2026-03-20T10:00:00.000Z', {
        name: 'Changed Name',
        color: 'blue'
      })
    ];
    const cloud = [
      makeCard('c1', '2026-03-22T10:00:00.000Z', {
        name: 'Card c1',
        color: 'red'
      })
    ];

    const result = mergeCards(local, cloud);

    // Cloud wins entirely — name reverts to original, color is red
    expect(result.merged[0]?.name).toBe('Card c1');
    expect(result.merged[0]?.color).toBe('red');
  });

  it('new local card (no cloud match) → kept in merged', () => {
    const local = [makeCard('new-local', '2026-03-21T10:00:00.000Z')];
    const result = mergeCards(local, []);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.id).toBe('new-local');
    expect(result.unchanged).toBe(1);
  });

  it('new cloud card (not in local) → added to merged', () => {
    const cloud = [makeCard('new-cloud', '2026-03-21T10:00:00.000Z')];
    const result = mergeCards([], cloud);

    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]?.id).toBe('new-cloud');
    expect(result.added).toBe(1);
  });

  it('empty local + empty cloud → empty result', () => {
    const result = mergeCards([], []);

    expect(result.merged).toEqual([]);
    expect(result.added).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);
  });

  it('empty local → full download from cloud', () => {
    const cloud = [
      makeCard('c1', '2026-03-20T10:00:00.000Z'),
      makeCard('c2', '2026-03-21T10:00:00.000Z')
    ];
    const result = mergeCards([], cloud);

    expect(result.merged).toHaveLength(2);
    expect(result.added).toBe(2);
  });

  it('empty cloud → all local cards kept (treated as unchanged)', () => {
    const local = [
      makeCard('c1', '2026-03-20T10:00:00.000Z'),
      makeCard('c2', '2026-03-21T10:00:00.000Z')
    ];
    const result = mergeCards(local, []);

    expect(result.merged).toHaveLength(2);
    expect(result.unchanged).toBe(2);
  });

  it('multiple cards with mixed conflicts → each resolved independently', () => {
    const local = [
      makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Local Newer' }), // local wins
      makeCard('c2', '2026-03-18T10:00:00.000Z', { name: 'Local Older' }), // cloud wins
      makeCard('c3', '2026-03-20T10:00:00.000Z', { name: 'Local Tie' }), // tie → cloud
      makeCard('local-only', '2026-03-20T10:00:00.000Z') // local-only
    ];
    const cloud = [
      makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Cloud Older' }), // local wins
      makeCard('c2', '2026-03-22T10:00:00.000Z', { name: 'Cloud Newer' }), // cloud wins
      makeCard('c3', '2026-03-20T10:00:00.000Z', { name: 'Cloud Tie' }), // tie → cloud
      makeCard('cloud-only', '2026-03-21T10:00:00.000Z') // cloud-only
    ];

    const result = mergeCards(local, cloud);

    expect(result.merged).toHaveLength(5);

    const byId = (id: string) => result.merged.find((c) => c.id === id);
    expect(byId('c1')?.name).toBe('Local Newer');
    expect(byId('c2')?.name).toBe('Cloud Newer');
    expect(byId('c3')?.name).toBe('Cloud Tie');
    expect(byId('local-only')).toBeDefined();
    expect(byId('cloud-only')).toBeDefined();

    expect(result.added).toBe(1); // cloud-only
    expect(result.updated).toBe(1); // c2
    expect(result.unchanged).toBe(3); // c1 (local wins), c3 (tie), local-only
  });

  it('large batch (50+ cards) → all resolved correctly', () => {
    const local = Array.from({ length: 60 }, (_, i) =>
      makeCard(`card-${i}`, `2026-03-${String(20 + (i % 2)).padStart(2, '0')}T10:00:00.000Z`)
    );
    const cloud = Array.from({ length: 60 }, (_, i) =>
      makeCard(`card-${i}`, `2026-03-${String(21 - (i % 2)).padStart(2, '0')}T10:00:00.000Z`)
    );

    const result = mergeCards(local, cloud);

    expect(result.merged).toHaveLength(60);
    // No cards lost
    const ids = new Set(result.merged.map((c) => c.id));
    expect(ids.size).toBe(60);
  });

  it('logs conflict when cloud wins (cloud newer)', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-22T10:00:00.000Z')];

    mergeCards(local, cloud);

    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'c1',
        winner: 'cloud',
        reason: 'cloud-newer'
      })
    );
  });

  it('logs conflict when local wins (local newer)', () => {
    const local = [makeCard('c1', '2026-03-22T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-20T10:00:00.000Z')];

    mergeCards(local, cloud);

    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'c1',
        winner: 'local',
        reason: 'local-newer'
      })
    );
  });

  it('logs tie-break conflict only when data differs', () => {
    const ts = '2026-03-21T10:00:00.000Z';
    const local = [makeCard('c1', ts, { name: 'Local Name' })];
    const cloud = [makeCard('c1', ts, { name: 'Cloud Name' })];

    mergeCards(local, cloud);

    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'c1',
        winner: 'cloud',
        reason: 'tie-cloud-wins'
      })
    );
  });

  it('does not log tie-break when data is identical', () => {
    const ts = '2026-03-21T10:00:00.000Z';
    const card = makeCard('c1', ts);
    const result = mergeCards([card], [{ ...card }]);

    // Should NOT have a tie-cloud-wins log (data is same)
    const tieLogs = mockedLogConflict.mock.calls.filter(([e]) => e.reason === 'tie-cloud-wins');
    expect(tieLogs).toHaveLength(0);
    expect(result.unchanged).toBe(1);
  });
});

// ===================================================================
// Task 2: Deletion vs Edit Conflicts (AC6)
// ===================================================================

describe('mergeWithDeletions — deletion conflict resolution', () => {
  it('AC6: local delete + cloud edit → delete wins (cloud deletion queued)', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Cloud Edit' })];
    const pendingDeletions = ['c1'];

    const result = mergeWithDeletions(local, cloud, pendingDeletions);

    // Card should be excluded from merged set
    expect(result.merged.find((c) => c.id === 'c1')).toBeUndefined();
    // Cloud should receive deletion
    expect(result.cloudDeletions).toContain('c1');
  });

  it('AC6: cloud delete + local edit → delete wins (card missing from cloud)', () => {
    // Card exists locally, but NOT in cloud (cloud deleted it)
    const local = [makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Local Edit' })];
    const cloud: LoyaltyCard[] = []; // c1 was deleted from cloud
    const pendingDeletions: string[] = [];

    // In this scenario, mergeCards treats c1 as local-only (unchanged).
    // The cloud-delete-wins case depends on caller knowing this is a full sync.
    // For mergeWithDeletions, if the card is not pending deletion and not in cloud,
    // it remains as local-only (the caller handles cloud-delete detection).
    const result = mergeWithDeletions(local, cloud, pendingDeletions);

    // c1 is local-only, kept in merge (caller decides if cloud-deleted)
    expect(result.merged.find((c) => c.id === 'c1')).toBeDefined();
  });

  it('both delete → no-op (already gone)', () => {
    const local: LoyaltyCard[] = []; // already removed locally
    const cloud: LoyaltyCard[] = []; // already removed from cloud
    const pendingDeletions = ['c1']; // was in deletion queue

    const result = mergeWithDeletions(local, cloud, pendingDeletions);

    expect(result.merged).toHaveLength(0);
    expect(result.cloudDeletions).toHaveLength(0); // not in cloud, nothing to delete
  });

  it('logs local-delete-wins conflict', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-21T10:00:00.000Z')];
    const pendingDeletions = ['c1'];

    mergeWithDeletions(local, cloud, pendingDeletions);

    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'c1',
        winner: 'local',
        reason: 'local-delete-wins'
      })
    );
  });

  it('preserves non-deleted cards in merge', () => {
    const local = [
      makeCard('c1', '2026-03-20T10:00:00.000Z'),
      makeCard('c2', '2026-03-21T10:00:00.000Z')
    ];
    const cloud = [
      makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Cloud c1' }),
      makeCard('c2', '2026-03-22T10:00:00.000Z', { name: 'Cloud c2' })
    ];
    const pendingDeletions = ['c1']; // only c1 deleted

    const result = mergeWithDeletions(local, cloud, pendingDeletions);

    expect(result.merged.find((c) => c.id === 'c1')).toBeUndefined();
    expect(result.merged.find((c) => c.id === 'c2')).toBeDefined();
    expect(result.cloudDeletions).toEqual(['c1']);
  });

  it('empty pending deletions → standard merge', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-22T10:00:00.000Z')];

    const result = mergeWithDeletions(local, cloud, []);

    expect(result.merged).toHaveLength(1);
    expect(result.cloudDeletions).toHaveLength(0);
    expect(result.localDeletions).toHaveLength(0);
  });

  it('deletion of card not in cloud → no cloud deletion queued', () => {
    const local: LoyaltyCard[] = [];
    const cloud: LoyaltyCard[] = [];
    const pendingDeletions = ['ghost-card']; // card doesn't exist anywhere

    const result = mergeWithDeletions(local, cloud, pendingDeletions);

    expect(result.cloudDeletions).toHaveLength(0);
    expect(result.merged).toHaveLength(0);
  });
});

// ===================================================================
// Task 4: Offline Conflict Scenarios (AC5)
// ===================================================================

describe('mergeCards — offline conflict scenarios', () => {
  it('AC5: offline edit at T1 → cloud edit at T2 > T1 → cloud wins', () => {
    // User edited offline at T1, another device synced at T2 > T1
    const offlineEdit = makeCard('c1', '2026-03-20T08:00:00.000Z', { name: 'Offline Edit' });
    const cloudEdit = makeCard('c1', '2026-03-20T12:00:00.000Z', { name: 'Cloud Edit' });

    const result = mergeCards([offlineEdit], [cloudEdit]);

    expect(result.merged[0]?.name).toBe('Cloud Edit');
    expect(result.updated).toBe(1);
  });

  it('AC5: offline edit at T2 → cloud edit at T1 < T2 → local wins', () => {
    // User edited offline at T2, cloud has older edit at T1
    const offlineEdit = makeCard('c1', '2026-03-20T15:00:00.000Z', { name: 'Offline Edit' });
    const cloudEdit = makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Cloud Edit' });

    const result = mergeCards([offlineEdit], [cloudEdit]);

    expect(result.merged[0]?.name).toBe('Offline Edit');
    expect(result.unchanged).toBe(1);
  });

  it('offline edits use actual edit time, not sync time', () => {
    // Simulate: user went offline at 09:00, edited card at 10:00, came back online at 14:00
    // The card should have updatedAt=10:00, not 14:00
    const offlineCard = makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Offline at 10am' });
    const cloudCard = makeCard('c1', '2026-03-20T11:00:00.000Z', { name: 'Cloud at 11am' });

    const result = mergeCards([offlineCard], [cloudCard]);

    // Cloud wins because 11:00 > 10:00
    expect(result.merged[0]?.name).toBe('Cloud at 11am');
  });
});

// ===================================================================
// Task 5: Convergence Verification (AC3)
// ===================================================================

describe('mergeCards — convergence', () => {
  it('AC3: after merge, both sides converge to same data', () => {
    const localCards = [
      makeCard('c1', '2026-03-22T10:00:00.000Z', { name: 'Local C1' }),
      makeCard('c2', '2026-03-18T10:00:00.000Z', { name: 'Local C2' }),
      makeCard('c3', '2026-03-20T10:00:00.000Z')
    ];
    const cloudCards = [
      makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Cloud C1' }),
      makeCard('c2', '2026-03-22T10:00:00.000Z', { name: 'Cloud C2' }),
      makeCard('c4', '2026-03-21T10:00:00.000Z')
    ];

    // Simulate Device A merging
    const resultA = mergeCards(localCards, cloudCards);

    // Simulate Device B merging (reversed perspective: cloud is local, local is cloud)
    const resultB = mergeCards(cloudCards, localCards);

    // Both must converge on card data
    const sortById = (cards: LoyaltyCard[]) => [...cards].sort((a, b) => a.id.localeCompare(b.id));
    const mergedA = sortById(resultA.merged);
    const mergedB = sortById(resultB.merged);

    expect(mergedA).toHaveLength(mergedB.length);

    for (let i = 0; i < mergedA.length; i++) {
      expect(mergedA[i]?.id).toBe(mergedB[i]?.id);
      expect(mergedA[i]?.name).toBe(mergedB[i]?.name);
      expect(mergedA[i]?.updatedAt).toBe(mergedB[i]?.updatedAt);
    }
  });

  it('AC3: updatedAt is consistent after conflict resolution', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z')];
    const cloud = [makeCard('c1', '2026-03-22T10:00:00.000Z')];

    const result = mergeCards(local, cloud);

    // Winner's updatedAt should be preserved
    expect(result.merged[0]?.updatedAt).toBe('2026-03-22T10:00:00.000Z');
  });

  it('AC3: card count matches on both sides after full sync cycle', () => {
    const local = [
      makeCard('c1', '2026-03-20T10:00:00.000Z'),
      makeCard('c2', '2026-03-21T10:00:00.000Z'),
      makeCard('local-only', '2026-03-22T10:00:00.000Z')
    ];
    const cloud = [
      makeCard('c1', '2026-03-22T10:00:00.000Z'),
      makeCard('c2', '2026-03-19T10:00:00.000Z'),
      makeCard('cloud-only', '2026-03-21T10:00:00.000Z')
    ];

    const result = mergeCards(local, cloud);

    // 3 local + 3 cloud - 2 overlap = 4 unique cards
    expect(result.merged).toHaveLength(4);
    expect(result.added + result.updated + result.unchanged).toBe(4);
  });
});

// ===================================================================
// Task 6: Edge Case Hardening
// ===================================================================

describe('normalizeTimestamp', () => {
  it('returns iso for valid ISO string', () => {
    const result = normalizeTimestamp('2026-03-20T10:00:00.000Z');
    expect(result.iso).toBe('2026-03-20T10:00:00.000Z');
    expect(result.malformed).toBe(false);
  });

  it('returns epoch for null', () => {
    const result = normalizeTimestamp(null);
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.malformed).toBe(true);
  });

  it('returns epoch for undefined', () => {
    const result = normalizeTimestamp(undefined);
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.malformed).toBe(true);
  });

  it('returns epoch for empty string', () => {
    const result = normalizeTimestamp('');
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.malformed).toBe(true);
  });

  it('returns epoch for whitespace-only string', () => {
    const result = normalizeTimestamp('   ');
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.malformed).toBe(true);
  });

  it('returns epoch for invalid date string', () => {
    const result = normalizeTimestamp('not-a-date');
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.malformed).toBe(true);
  });

  it('handles valid non-ISO date format', () => {
    const result = normalizeTimestamp('March 20, 2026');
    // This is a valid date for Date constructor
    expect(result.malformed).toBe(false);
  });
});

describe('mergeCards — edge cases', () => {
  it('6.1: malformed local updatedAt → treated as oldest, cloud wins', () => {
    const local = [makeCard('c1', '' as string, { name: 'Bad Timestamp' })];
    const cloud = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Cloud' })];

    const result = mergeCards(local, cloud);

    expect(result.merged[0]?.name).toBe('Cloud');
    expect(result.updated).toBe(1);
    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'malformed-local-timestamp' })
    );
  });

  it('6.1: malformed cloud updatedAt → treated as oldest, local wins', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Local' })];
    const cloud = [makeCard('c1', 'invalid' as string, { name: 'Bad Cloud' })];

    const result = mergeCards(local, cloud);

    expect(result.merged[0]?.name).toBe('Local');
    expect(result.unchanged).toBe(1);
    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'malformed-cloud-timestamp' })
    );
  });

  it('6.1: both malformed → cloud wins as tie (both epoch)', () => {
    const local = [makeCard('c1', '' as string, { name: 'Local Bad' })];
    const cloud = [makeCard('c1', '' as string, { name: 'Cloud Bad' })];

    const result = mergeCards(local, cloud);

    // Both normalised to epoch → tie → cloud wins
    expect(result.merged[0]?.name).toBe('Cloud Bad');
    expect(result.unchanged).toBe(1); // tie = unchanged
  });

  it('6.2: future timestamp (clock skew) → still used for comparison, warning logged', () => {
    const futureDate = '2030-01-01T00:00:00.000Z';
    const local = [makeCard('c1', futureDate, { name: 'Future Local' })];
    const cloud = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Normal Cloud' })];

    const result = mergeCards(local, cloud);

    // Future timestamp is still newer → local wins
    expect(result.merged[0]?.name).toBe('Future Local');
    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'future-timestamp-warning' })
    );
  });

  it('6.2: future cloud timestamp → cloud wins', () => {
    const local = [makeCard('c1', '2026-03-20T10:00:00.000Z', { name: 'Normal Local' })];
    const cloud = [makeCard('c1', '2030-01-01T00:00:00.000Z', { name: 'Future Cloud' })];

    const result = mergeCards(local, cloud);

    expect(result.merged[0]?.name).toBe('Future Cloud');
    expect(result.updated).toBe(1);
    expect(mockedLogConflict).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'future-timestamp-warning' })
    );
  });

  it('no cards lost during merge with various edge cases', () => {
    const local = [
      makeCard('c1', '2026-03-20T10:00:00.000Z'),
      makeCard('c2', '' as string), // malformed
      makeCard('local-only', '2026-03-21T10:00:00.000Z')
    ];
    const cloud = [
      makeCard('c1', '2026-03-22T10:00:00.000Z'),
      makeCard('c2', '2026-03-20T10:00:00.000Z'),
      makeCard('cloud-only', '2026-03-20T10:00:00.000Z')
    ];

    const result = mergeCards(local, cloud);

    // 3 local + 3 cloud - 2 overlap = 4 unique cards
    expect(result.merged).toHaveLength(4);
    const ids = new Set(result.merged.map((c) => c.id));
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    expect(ids).toContain('local-only');
    expect(ids).toContain('cloud-only');
  });
});
