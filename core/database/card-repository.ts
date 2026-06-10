/**
 * Card Repository Module
 * Story 1.4: Set Up Local Database
 *
 * Provides CRUD operations for loyalty cards with transaction support.
 * All write operations use transactions for data integrity.
 */

import { SQLiteDatabase } from 'expo-sqlite';

import { LoyaltyCard, BarcodeFormat, CardColor } from '../schemas';
import { pushCardsToWatch, type WatchUsageEvent } from '../watch-connectivity';
import { getDatabase } from './database';

async function pushSnapshotToWatch(db: SQLiteDatabase): Promise<void> {
  try {
    const cards = await getAllCards(db);
    await pushCardsToWatch(cards);
  } catch {
    // best-effort — never fail a DB write because the watch couldn't be reached
  }
}

/**
 * Raw card row from database (snake_case columns)
 */
interface CardRow {
  id: string;
  name: string;
  barcode: string;
  barcode_format: string;
  brand_id: string | null;
  color: string;
  is_favorite: number;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Convert database row to LoyaltyCard domain object
 */
function rowToCard(row: CardRow): LoyaltyCard {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode,
    barcodeFormat: row.barcode_format as BarcodeFormat,
    brandId: row.brand_id,
    color: row.color as CardColor,
    isFavorite: row.is_favorite === 1,
    lastUsedAt: row.last_used_at,
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Get all cards from the database
 * Orders alphabetically by name for easier navigation
 */
export async function getAllCards(db: SQLiteDatabase = getDatabase()): Promise<LoyaltyCard[]> {
  const rows = await db.getAllAsync<CardRow>('SELECT * FROM loyalty_cards ORDER BY name ASC');
  return rows.map(rowToCard);
}

/**
 * Get a single card by ID
 * Returns null if not found
 */
export async function getCardById(
  id: string,
  db: SQLiteDatabase = getDatabase()
): Promise<LoyaltyCard | null> {
  const row = await db.getFirstAsync<CardRow>('SELECT * FROM loyalty_cards WHERE id = ?', [id]);
  return row ? rowToCard(row) : null;
}

/**
 * Insert a new card into the database
 * Uses a transaction for data integrity
 */
export async function insertCard(
  card: LoyaltyCard,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO loyalty_cards (
        id, name, barcode, barcode_format, brand_id, color,
        is_favorite, last_used_at, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        card.name,
        card.barcode,
        card.barcodeFormat,
        card.brandId,
        card.color,
        card.isFavorite ? 1 : 0,
        card.lastUsedAt,
        card.usageCount,
        card.createdAt,
        card.updatedAt
      ]
    );
  });
  await pushSnapshotToWatch(db);
}

/**
 * Update an existing card in the database
 * Uses a transaction for data integrity
 */
export async function updateCard(
  card: LoyaltyCard,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE loyalty_cards SET
        name = ?,
        barcode = ?,
        barcode_format = ?,
        brand_id = ?,
        color = ?,
        is_favorite = ?,
        last_used_at = ?,
        usage_count = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        card.name,
        card.barcode,
        card.barcodeFormat,
        card.brandId,
        card.color,
        card.isFavorite ? 1 : 0,
        card.lastUsedAt,
        card.usageCount,
        card.updatedAt,
        card.id
      ]
    );
  });
  await pushSnapshotToWatch(db);
}

/**
 * Delete a card from the database
 * Uses a transaction for data integrity
 */
export async function deleteCard(id: string, db: SQLiteDatabase = getDatabase()): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM loyalty_cards WHERE id = ?', [id]);
  });
  await pushSnapshotToWatch(db);
}

/**
 * Insert or update a card (upsert operation)
 * Uses a transaction for data integrity
 */
export async function upsertCard(
  card: LoyaltyCard,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO loyalty_cards (
        id, name, barcode, barcode_format, brand_id, color,
        is_favorite, last_used_at, usage_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        card.name,
        card.barcode,
        card.barcodeFormat,
        card.brandId,
        card.color,
        card.isFavorite ? 1 : 0,
        card.lastUsedAt,
        card.usageCount,
        card.createdAt,
        card.updatedAt
      ]
    );
  });
  await pushSnapshotToWatch(db);
}

/**
 * Delete all cards from the database
 * Uses a transaction for data integrity
 * Useful for testing and data reset scenarios
 */
export async function deleteAllCards(db: SQLiteDatabase = getDatabase()): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM loyalty_cards');
  });
  await pushSnapshotToWatch(db);
}

/**
 * Batch upsert multiple cards in a single transaction
 * Story 7.2: Download Cards from Cloud — atomic merge persistence
 */
export async function batchUpsertCards(
  cards: LoyaltyCard[],
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  if (cards.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const card of cards) {
      await db.runAsync(
        `INSERT OR REPLACE INTO loyalty_cards (
          id, name, barcode, barcode_format, brand_id, color,
          is_favorite, last_used_at, usage_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          card.name,
          card.barcode,
          card.barcodeFormat,
          card.brandId,
          card.color,
          card.isFavorite ? 1 : 0,
          card.lastUsedAt,
          card.usageCount,
          card.createdAt,
          card.updatedAt
        ]
      );
    }
  });
  await pushSnapshotToWatch(db);
}

/**
 * Increment a card's usage count and stamp its last-used time.
 * Story 9.1: Track Card Usage
 *
 * Atomic single-statement UPDATE (SQLite guarantees statement atomicity, so no
 * transaction is needed). Unknown ids affect 0 rows and silently no-op. Pushes
 * the updated snapshot to the Watch, matching every other write function.
 */
export async function incrementUsageCount(
  id: string,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE loyalty_cards
      SET usage_count = usage_count + 1,
          last_used_at = ?,
          updated_at = ?
      WHERE id = ?`,
    [now, now, id]
  );
  await pushSnapshotToWatch(db);
}

/**
 * Toggle a card's favourite flag and stamp updated_at.
 * Story 9.2: Mark Card as Favorite
 *
 * Atomic single-statement UPDATE (SQLite guarantees statement atomicity, so no
 * transaction is needed). `NOT is_favorite` flips the stored 0/1 in either
 * direction. Unknown ids affect 0 rows and silently no-op. Pushes the updated
 * snapshot to the Watch (AC5), matching every other write function. The bumped
 * updated_at is what existing delta sync picks up to propagate to cloud (AC4).
 */
export async function toggleFavorite(
  id: string,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE loyalty_cards
      SET is_favorite = NOT is_favorite,
          updated_at = ?
      WHERE id = ?`,
    [now, id]
  );
  await pushSnapshotToWatch(db);
}

/**
 * How long applied watch-usage event ids are retained for dedup. Retransmits
 * arrive promptly after the next app launch (the library re-delivers its
 * native queue on subscribe), so 30 days is generous headroom while keeping
 * the ledger bounded per ADR-2026-06-09-001.
 */
const WATCH_USAGE_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Apply a batch of watch CARD_USED events (Story 9.6, ADR-2026-06-09-001).
 *
 * Delivery is at-least-once (`transferUserInfo` retransmits after relaunch),
 * so each event id `"<cardId>:<usedAt>"` is applied exactly once: the
 * INSERT OR IGNORE into the persisted `watch_usage_events` ledger decides
 * first sight, and only then does the card row change. Reconciliation is
 * conflict-free by construction — `usage_count += 1` is commutative and
 * `last_used_at` takes max(current, usedAt), comparing ms-precision ISO-8601
 * UTC strings (lexicographic order == chronological order). `updated_at` is
 * bumped so delta sync propagates the change to the cloud, as in
 * `incrementUsageCount` (Story 9.1) — with one deliberate difference: the
 * phone path stamps `last_used_at = now`, while watch events take
 * `max(current, usedAt)` so late or out-of-order delivery stays idempotent.
 *
 * Pushes ONE refreshed snapshot to the watch when anything changed (AC5).
 * Returns the number of events that mutated a card row.
 */
export async function applyWatchUsageEvents(
  events: WatchUsageEvent[],
  db: SQLiteDatabase = getDatabase()
): Promise<number> {
  if (events.length === 0) return 0;

  const now = new Date();
  const nowIso = now.toISOString();
  const pruneBefore = new Date(now.getTime() - WATCH_USAGE_EVENT_RETENTION_MS).toISOString();
  let appliedCount = 0;

  await db.withTransactionAsync(async () => {
    for (const event of events) {
      const eventId = `${event.id}:${event.usedAt}`;
      const inserted = await db.runAsync(
        'INSERT OR IGNORE INTO watch_usage_events (event_id, applied_at) VALUES (?, ?)',
        [eventId, nowIso]
      );
      if ((inserted?.changes ?? 0) === 0) {
        continue; // already applied — duplicate/retransmit (AC3)
      }

      const updated = await db.runAsync(
        `UPDATE loyalty_cards
          SET usage_count = usage_count + 1,
              last_used_at = CASE
                WHEN last_used_at IS NULL OR last_used_at < ? THEN ?
                ELSE last_used_at
              END,
              updated_at = ?
          WHERE id = ?`,
        [event.usedAt, event.usedAt, nowIso, event.id]
      );
      if ((updated?.changes ?? 0) > 0) {
        appliedCount += 1;
      }
    }

    await db.runAsync('DELETE FROM watch_usage_events WHERE applied_at < ?', [pruneBefore]);
  });

  if (appliedCount > 0) {
    await pushSnapshotToWatch(db);
  }
  return appliedCount;
}

/**
 * Get the count of cards in the database
 */
export async function getCardCount(db: SQLiteDatabase = getDatabase()): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM loyalty_cards'
  );
  return result?.count ?? 0;
}
