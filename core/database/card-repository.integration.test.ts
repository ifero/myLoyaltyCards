/**
 * Card Repository Integration Tests
 * Story 9.1: Track Card Usage — Rec #3 (TEA test-review 2026-06-06)
 *
 * Unlike card-repository.test.ts (which mocks db.runAsync and asserts the SQL
 * *string*), these tests execute the ACTUAL SQL against a real in-memory SQLite
 * database (better-sqlite3) built from the real migration schema. This verifies
 * the database *effect* — e.g. that usage_count truly increments 1→2 — so a
 * column-name typo or bad WHERE clause would fail here even though the
 * string-matching unit tests pass.
 */

import Database from 'better-sqlite3';
import { SQLiteDatabase } from 'expo-sqlite';

import {
  applyWatchUsageEvents,
  getCardById,
  incrementUsageCount,
  insertCard,
  toggleFavorite
} from './card-repository';
import { runMigrations } from './migrations';
import { LoyaltyCard } from '../schemas';

// Watch sync is best-effort and irrelevant to DB semantics — stub it out.
jest.mock('../watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined)
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pushCardsToWatch } = require('../watch-connectivity') as {
  pushCardsToWatch: jest.Mock;
};

/**
 * Adapt a synchronous better-sqlite3 instance to the async expo-sqlite
 * SQLiteDatabase surface used by the repository.
 */
function makeRealDb(): { db: SQLiteDatabase; close: () => void } {
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
}

const makeCard = (overrides: Partial<LoyaltyCard> = {}): LoyaltyCard => ({
  id: 'card-1',
  name: 'Card A',
  barcode: '12345',
  barcodeFormat: 'EAN13',
  brandId: null,
  color: 'green',
  isFavorite: false,
  lastUsedAt: null,
  usageCount: 0,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
  ...overrides
});

describe('card-repository integration (real SQLite)', () => {
  let db: SQLiteDatabase;
  let close: () => void;

  beforeEach(async () => {
    jest.clearAllMocks(); // reset pushCardsToWatch mock call-count between tests
    ({ db, close } = makeRealDb());
    await runMigrations(db); // build the real schema from production migration SQL
  });

  afterEach(() => close());

  test('incrementUsageCount actually increments usage_count 0→1→2 and stamps ISO lastUsedAt (AC1, AC2)', async () => {
    await insertCard(makeCard({ id: 'c1', usageCount: 0, lastUsedAt: null }), db);

    await incrementUsageCount('c1', db);
    let card = await getCardById('c1', db);
    expect(card?.usageCount).toBe(1);
    expect(card?.lastUsedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    await incrementUsageCount('c1', db);
    card = await getCardById('c1', db);
    expect(card?.usageCount).toBe(2); // each focus is a distinct, persisted usage event
  });

  test('incrementUsageCount only touches the targeted row (no cross-card bleed)', async () => {
    await insertCard(makeCard({ id: 'c1', name: 'Alpha', usageCount: 0 }), db);
    await insertCard(makeCard({ id: 'c2', name: 'Beta', usageCount: 5 }), db);

    await incrementUsageCount('c1', db);

    expect((await getCardById('c1', db))?.usageCount).toBe(1);
    expect((await getCardById('c2', db))?.usageCount).toBe(5); // untouched
  });

  test('incrementUsageCount silently no-ops for an unknown id — row state unchanged (AC5)', async () => {
    await insertCard(
      makeCard({ id: 'c1', usageCount: 3, lastUsedAt: '2020-01-01T00:00:00.000Z' }),
      db
    );

    await expect(incrementUsageCount('does-not-exist', db)).resolves.toBeUndefined();

    const card = await getCardById('c1', db);
    expect(card?.usageCount).toBe(3);
    expect(card?.lastUsedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  test('toggleFavorite actually flips is_favorite false→true→false and bumps updatedAt (AC1)', async () => {
    await insertCard(
      makeCard({ id: 'c1', isFavorite: false, updatedAt: '2020-01-01T00:00:00.000Z' }),
      db
    );

    await toggleFavorite('c1', db);
    let card = await getCardById('c1', db);
    expect(card?.isFavorite).toBe(true); // false → true
    expect(card?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(card?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z'); // bumped

    await toggleFavorite('c1', db);
    card = await getCardById('c1', db);
    expect(card?.isFavorite).toBe(false); // true → false (NOT is_favorite is bidirectional)
  });

  test('toggleFavorite only touches the targeted row (no cross-card bleed)', async () => {
    await insertCard(makeCard({ id: 'c1', name: 'Alpha', isFavorite: false }), db);
    await insertCard(makeCard({ id: 'c2', name: 'Beta', isFavorite: true }), db);

    await toggleFavorite('c1', db);

    expect((await getCardById('c1', db))?.isFavorite).toBe(true);
    expect((await getCardById('c2', db))?.isFavorite).toBe(true); // untouched
  });

  test('toggleFavorite silently no-ops for an unknown id — row state unchanged (AC1)', async () => {
    await insertCard(
      makeCard({ id: 'c1', isFavorite: true, updatedAt: '2020-01-01T00:00:00.000Z' }),
      db
    );

    await expect(toggleFavorite('does-not-exist', db)).resolves.toBeUndefined();

    const card = await getCardById('c1', db);
    expect(card?.isFavorite).toBe(true);
    expect(card?.updatedAt).toBe('2020-01-01T00:00:00.000Z'); // unchanged
  });

  // Story 9.6 (ADR-2026-06-09-001): watch CARD_USED events applied on the phone.
  // These run the REAL SQL — the CASE-WHEN max() logic, INSERT OR IGNORE dedup,
  // and pruning are exactly what AC2/AC3 hinge on.
  describe('applyWatchUsageEvents', () => {
    const event = (id: string, usedAt: string) => ({ id, usedAt });

    test('increments usageCount and stamps lastUsedAt from the event time (AC1)', async () => {
      await insertCard(
        makeCard({
          id: 'c1',
          usageCount: 0,
          lastUsedAt: null,
          updatedAt: '2020-01-01T00:00:00.000Z'
        }),
        db
      );

      const applied = await applyWatchUsageEvents([event('c1', '2026-06-09T10:00:00.123Z')], db);

      expect(applied).toBe(1);
      const card = await getCardById('c1', db);
      expect(card?.usageCount).toBe(1);
      expect(card?.lastUsedAt).toBe('2026-06-09T10:00:00.123Z'); // event time, not apply time
      expect(card?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(card?.updatedAt).not.toBe('2020-01-01T00:00:00.000Z'); // delta sync pickup
    });

    test('is commutative — applying events in any order converges (AC2)', async () => {
      const e1 = event('c1', '2026-06-09T10:00:00.000Z');
      const e2 = event('c1', '2026-06-09T11:30:00.500Z');

      const forward = makeRealDb();
      const reverse = makeRealDb();
      try {
        for (const { db: target } of [forward, reverse]) {
          await runMigrations(target);
          await insertCard(makeCard({ id: 'c1', usageCount: 0, lastUsedAt: null }), target);
        }

        await applyWatchUsageEvents([e1], forward.db);
        await applyWatchUsageEvents([e2], forward.db);

        await applyWatchUsageEvents([e2], reverse.db);
        await applyWatchUsageEvents([e1], reverse.db);

        const forwardCard = await getCardById('c1', forward.db);
        const reverseCard = await getCardById('c1', reverse.db);
        expect(forwardCard?.usageCount).toBe(2);
        expect(reverseCard?.usageCount).toBe(2);
        expect(forwardCard?.lastUsedAt).toBe('2026-06-09T11:30:00.500Z'); // max wins
        expect(reverseCard?.lastUsedAt).toBe('2026-06-09T11:30:00.500Z');
      } finally {
        forward.close();
        reverse.close();
      }
    });

    test('keeps lastUsedAt monotonic when an older event arrives late (AC2)', async () => {
      await insertCard(
        makeCard({ id: 'c1', usageCount: 5, lastUsedAt: '2026-06-09T12:00:00.000Z' }),
        db
      );

      const applied = await applyWatchUsageEvents([event('c1', '2026-06-09T08:00:00.000Z')], db);

      expect(applied).toBe(1);
      const card = await getCardById('c1', db);
      expect(card?.usageCount).toBe(6); // the open still counts…
      expect(card?.lastUsedAt).toBe('2026-06-09T12:00:00.000Z'); // …but max() keeps the newer stamp
    });

    test('never double-counts a redelivered event — dedup across batches (AC3)', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      const e1 = event('c1', '2026-06-09T10:00:00.123Z');

      expect(await applyWatchUsageEvents([e1], db)).toBe(1);
      expect(await applyWatchUsageEvents([e1], db)).toBe(0); // retransmit after relaunch
      expect(await applyWatchUsageEvents([e1, e1], db)).toBe(0);

      expect((await getCardById('c1', db))?.usageCount).toBe(1);
    });

    test('dedups duplicates inside a single delivered batch (AC3)', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      const e1 = event('c1', '2026-06-09T10:00:00.123Z');

      const applied = await applyWatchUsageEvents([e1, e1, e1], db);

      expect(applied).toBe(1);
      expect((await getCardById('c1', db))?.usageCount).toBe(1);
    });

    test('two distinct opens of the same card both count — ms precision keeps ids distinct (AC1, AC3)', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);

      const applied = await applyWatchUsageEvents(
        [event('c1', '2026-06-09T10:00:00.123Z'), event('c1', '2026-06-09T10:00:00.456Z')],
        db
      );

      expect(applied).toBe(2);
      expect((await getCardById('c1', db))?.usageCount).toBe(2);
    });

    test('an event for a deleted/unknown card is recorded but mutates nothing', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      const ghost = event('ghost', '2026-06-09T10:00:00.123Z');

      expect(await applyWatchUsageEvents([ghost], db)).toBe(0);
      expect(await applyWatchUsageEvents([ghost], db)).toBe(0); // still deduped on retransmit

      expect((await getCardById('c1', db))?.usageCount).toBe(0);
    });

    test('prunes dedup rows older than the retention window', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      await db.runAsync('INSERT INTO watch_usage_events (event_id, applied_at) VALUES (?, ?)', [
        'ancient:2020-01-01T00:00:00.000Z',
        '2020-01-01T00:00:00.000Z'
      ]);

      await applyWatchUsageEvents([event('c1', '2026-06-09T10:00:00.123Z')], db);

      const remaining = await db.getAllAsync<{ event_id: string }>(
        'SELECT event_id FROM watch_usage_events'
      );
      const ids = remaining.map((row) => row.event_id);
      expect(ids).not.toContain('ancient:2020-01-01T00:00:00.000Z'); // pruned
      expect(ids).toContain('c1:2026-06-09T10:00:00.123Z'); // fresh row kept
    });

    test('re-syncs the snapshot to the watch once per batch with applied events (AC5)', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      pushCardsToWatch.mockClear();

      await applyWatchUsageEvents(
        [event('c1', '2026-06-09T10:00:00.123Z'), event('c1', '2026-06-09T10:00:01.456Z')],
        db
      );

      expect(pushCardsToWatch).toHaveBeenCalledTimes(1); // batched, not per-event
      const pushedCards = pushCardsToWatch.mock.calls[0]![0];
      expect(pushedCards).toHaveLength(1);
      expect(pushedCards[0].usageCount).toBe(2); // snapshot reflects the applied usage
    });

    test('does not re-sync when every event was a duplicate or unknown', async () => {
      await insertCard(makeCard({ id: 'c1', usageCount: 0 }), db);
      const e1 = event('c1', '2026-06-09T10:00:00.123Z');
      await applyWatchUsageEvents([e1], db);
      pushCardsToWatch.mockClear();

      await applyWatchUsageEvents([e1, event('ghost', '2026-06-09T11:00:00.000Z')], db);

      expect(pushCardsToWatch).not.toHaveBeenCalled();
    });

    test('empty batch is a no-op', async () => {
      pushCardsToWatch.mockClear();
      expect(await applyWatchUsageEvents([], db)).toBe(0);
      expect(pushCardsToWatch).not.toHaveBeenCalled();
    });
  });
});
