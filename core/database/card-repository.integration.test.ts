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

import { getCardById, incrementUsageCount, insertCard, toggleFavorite } from './card-repository';
import { runMigrations } from './migrations';
import { LoyaltyCard } from '../schemas';

// Watch sync is best-effort and irrelevant to DB semantics — stub it out.
jest.mock('../watch-connectivity', () => ({
  pushCardsToWatch: jest.fn().mockResolvedValue(undefined)
}));

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
});
