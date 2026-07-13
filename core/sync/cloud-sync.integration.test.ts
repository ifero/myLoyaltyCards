/**
 * Cloud-Sync Deletion Regression — Integration Tests (real SQLite)
 * Story 16.11: Fix card-deletion cloud resurrection
 *
 * Unlike cloud-sync.test.ts (which mocks getAllCards and never persists), these
 * run the REAL downloadCloudCards → mergeWithDeletions → batchUpsertCards
 * pipeline against a real in-memory SQLite database (better-sqlite3) built from
 * the production migration schema. This is the ONLY layer that catches the
 * actual bug: a full cloud fetch re-adds the deleted card and batchUpsertCards'
 * `INSERT OR REPLACE` resurrects the row locally. A string-matching unit test
 * would stay green while the card silently comes back (see the 9.x stories that
 * established this real-DB pattern).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Database from 'better-sqlite3';
import { SQLiteDatabase } from 'expo-sqlite';

import {
  batchUpsertCards,
  deleteCard,
  getAllCards,
  insertCard
} from '@/core/database/card-repository';
import { runMigrations } from '@/core/database/migrations';
import { LoyaltyCard } from '@/core/schemas';
import { addPendingDeletion, getPendingDeletions, removePendingDeletions } from '@/core/sync';

import { downloadCloudCards, type DeletionSyncDeps } from './cloud-sync';
import { CloudCardRow } from './mappers';

// Point the repository's default getDatabase() at our in-memory DB so the REAL
// downloadCloudCards (which calls getAllCards()/batchUpsertCards() with no db
// arg) and this test operate on exactly the same database. `mockDb` is reassigned
// per-test; the getter closes over the binding so it always sees the latest.
// jest.mock is hoisted above the imports by babel, so the mock is registered
// before card-repository resolves its ./database dependency.
let mockDb: SQLiteDatabase;
jest.mock('@/core/database/database', () => ({
  getDatabase: () => mockDb
}));

// Watch push is best-effort and irrelevant to sync semantics — stub it out.
jest.mock('@/core/watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined)
}));

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

// Valid UUID-v4-shaped ids (cloudRowToLocalCard validates against the schema and
// silently skips malformed ids — see cloud-sync.test.ts "skips invalid rows").
const CARD_X = '11111111-1111-4111-8111-111111111111'; // deleted card
const SURVIVOR = '22222222-2222-4222-8222-222222222222'; // untouched card
const DEL_OK = '33333333-3333-4333-8333-333333333333';
const DEL_FAIL = '44444444-4444-4444-8444-444444444444';

/**
 * Adapt a synchronous better-sqlite3 instance to the async expo-sqlite surface
 * the repository expects. Mirrors card-repository.integration.test.ts (kept local
 * to stay within this story's change surface).
 */
const makeRealDb = (): { db: SQLiteDatabase; close: () => void } => {
  const sqlite = new Database(':memory:');
  const adapter = {
    runAsync: async (sql: string, params: unknown[] = []) => {
      const info = sqlite.prepare(sql).run(...(params as never[]));
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    getAllAsync: async (sql: string, params: unknown[] = []) =>
      sqlite.prepare(sql).all(...(params as never[])),
    getFirstAsync: async (sql: string, params: unknown[] = []) =>
      sqlite.prepare(sql).get(...(params as never[])) ?? null,
    execAsync: async (sql: string) => {
      sqlite.exec(sql);
    },
    withTransactionAsync: async (fn: () => Promise<unknown>) => {
      await fn();
    }
  } as unknown as SQLiteDatabase;
  return { db: adapter, close: () => sqlite.close() };
};

const makeCard = (id: string, name = `Card ${id}`): LoyaltyCard => ({
  id,
  name,
  barcode: `barcode-${id}`,
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'blue',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
});

const makeCloudRow = (id: string, name = `Card ${id}`): CloudCardRow => ({
  id,
  user_id: USER_ID,
  name,
  barcode: `barcode-${id}`,
  barcode_format: 'EAN13',
  brand_id: null,
  color: 'blue',
  is_favorite: false,
  last_used_at: null,
  usage_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
});

// A jest-mocked cloud delete so we can assert calls and simulate failures; the
// queue read/clear use the REAL AsyncStorage-backed tracker so drains round-trip.
const deleteFromCloud = jest.fn<Promise<{ error: string | null }>, [string, string]>();
const deletions: DeletionSyncDeps = {
  getPendingDeletions,
  deleteFromCloud,
  removeDrained: removePendingDeletions
};

let close: () => void;

beforeEach(async () => {
  await AsyncStorage.clear();
  deleteFromCloud.mockReset().mockResolvedValue({ error: null });
  ({ db: mockDb, close } = makeRealDb());
  await runMigrations(mockDb);
});

afterEach(() => close());

describe('deletion-aware download (real SQLite)', () => {
  it('AC1: a hard-deleted card still present in the cloud is NOT resurrected locally', async () => {
    // Seed both cards, then delete cardX exactly as a signed-in user would:
    // hard-delete the local row + enqueue the pending cloud deletion.
    await insertCard(makeCard(CARD_X, 'Deleted Store'));
    await insertCard(makeCard(SURVIVOR, 'Kept Store'));
    await deleteCard(CARD_X);
    await addPendingDeletion(CARD_X);

    // The cloud still holds cardX (that is the whole bug).
    const fetchFn = jest.fn().mockResolvedValue({
      data: [makeCloudRow(CARD_X, 'Deleted Store'), makeCloudRow(SURVIVOR, 'Kept Store')],
      error: null
    });

    const result = await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });
    // Persist the merged set exactly as useCloudSync.performSync does.
    await batchUpsertCards(result.mergeResult!.merged);

    const ids = (await getAllCards()).map((c) => c.id);
    expect(ids).not.toContain(CARD_X); // stayed deleted
    expect(ids).toContain(SURVIVOR); // untouched
  });

  it('AC2: the deleted card is removed from the cloud and cleared from the queue', async () => {
    await insertCard(makeCard(SURVIVOR));
    await addPendingDeletion(CARD_X); // cardX already hard-deleted locally

    const fetchFn = jest.fn().mockResolvedValue({
      data: [makeCloudRow(CARD_X), makeCloudRow(SURVIVOR)],
      error: null
    });

    await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });

    expect(deleteFromCloud).toHaveBeenCalledWith(CARD_X, USER_ID);
    expect(await getPendingDeletions()).toEqual([]); // fully drained
  });

  it('REGRESSION: without the deletions bundle the card resurrects (the fix is load-bearing)', async () => {
    await insertCard(makeCard(SURVIVOR));
    await addPendingDeletion(CARD_X); // hard-deleted locally, still in the queue

    const fetchFn = jest.fn().mockResolvedValue({
      data: [makeCloudRow(CARD_X), makeCloudRow(SURVIVOR)],
      error: null
    });

    // No deletions bundle → the old deletion-blind path.
    const result = await downloadCloudCards(USER_ID, fetchFn, { forceSync: true });
    await batchUpsertCards(result.mergeResult!.merged);

    // Documents the bug this story fixes: cardX comes back.
    expect((await getAllCards()).map((c) => c.id)).toContain(CARD_X);
    expect(deleteFromCloud).not.toHaveBeenCalled();
  });

  it('AC3: on partial cloud-delete failure, retains only the failed id and never resurrects locally', async () => {
    await insertCard(makeCard(SURVIVOR));
    await addPendingDeletion(DEL_OK);
    await addPendingDeletion(DEL_FAIL);
    deleteFromCloud.mockImplementation(async (id) =>
      id === DEL_FAIL ? { error: 'server 500' } : { error: null }
    );

    const fetchFn = jest.fn().mockResolvedValue({
      data: [makeCloudRow(DEL_OK), makeCloudRow(DEL_FAIL), makeCloudRow(SURVIVOR)],
      error: null
    });

    const result = await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });
    await batchUpsertCards(result.mergeResult!.merged);

    // Neither queued card resurrects — the merge excludes every pending deletion.
    expect((await getAllCards()).map((c) => c.id)).toEqual([SURVIVOR]);
    // Only the failed id is retained for retry; the succeeded id was cleared.
    expect(await getPendingDeletions()).toEqual([DEL_FAIL]);
  });

  it('AC3: self-heals on the next run after a transient cloud-delete failure', async () => {
    await addPendingDeletion(DEL_FAIL);
    const fetchFn = jest.fn().mockResolvedValue({ data: [makeCloudRow(DEL_FAIL)], error: null });

    deleteFromCloud.mockResolvedValueOnce({ error: 'server 500' }); // run 1 fails
    await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });
    expect(await getPendingDeletions()).toEqual([DEL_FAIL]); // retained

    // run 2 (default mock resolves ok) succeeds → queue cleared
    await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });
    expect(await getPendingDeletions()).toEqual([]);
  });

  it('AC4: with an empty deletion queue the bundle is a no-op (LWW merge unchanged)', async () => {
    await insertCard(makeCard(SURVIVOR, 'Local'));
    const fetchFn = jest.fn().mockResolvedValue({
      data: [makeCloudRow(SURVIVOR, 'Local'), makeCloudRow(CARD_X, 'Cloud Only')],
      error: null
    });

    const result = await downloadCloudCards(USER_ID, fetchFn, { forceSync: true, deletions });
    await batchUpsertCards(result.mergeResult!.merged);

    expect(deleteFromCloud).not.toHaveBeenCalled();
    expect((await getAllCards()).map((c) => c.id).sort()).toEqual([CARD_X, SURVIVOR].sort());
  });
});
