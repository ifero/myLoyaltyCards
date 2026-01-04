/**
 * Card Repository Module
 * Story 1.4: Set Up Local Database
 *
 * Provides CRUD operations for loyalty cards with transaction support.
 * All write operations use transactions for data integrity.
 */

import { SQLiteDatabase } from 'expo-sqlite';

import { LoyaltyCard, BarcodeFormat, CardColor } from '../schemas';
import { getDatabase } from './database';

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
    updatedAt: row.updated_at,
  };
}

/**
 * Get all cards from the database
 * Orders by createdAt descending (newest first) for MVP
 */
export async function getAllCards(
  db: SQLiteDatabase = getDatabase()
): Promise<LoyaltyCard[]> {
  const rows = await db.getAllAsync<CardRow>(
    'SELECT * FROM loyalty_cards ORDER BY created_at DESC'
  );
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
  const row = await db.getFirstAsync<CardRow>(
    'SELECT * FROM loyalty_cards WHERE id = ?',
    [id]
  );
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
        card.updatedAt,
      ]
    );
  });
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
        card.id,
      ]
    );
  });
}

/**
 * Delete a card from the database
 * Uses a transaction for data integrity
 */
export async function deleteCard(
  id: string,
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM loyalty_cards WHERE id = ?', [id]);
  });
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
        card.updatedAt,
      ]
    );
  });
}

/**
 * Delete all cards from the database
 * Uses a transaction for data integrity
 * Useful for testing and data reset scenarios
 */
export async function deleteAllCards(
  db: SQLiteDatabase = getDatabase()
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM loyalty_cards');
  });
}

/**
 * Get the count of cards in the database
 */
export async function getCardCount(
  db: SQLiteDatabase = getDatabase()
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM loyalty_cards'
  );
  return result?.count ?? 0;
}
