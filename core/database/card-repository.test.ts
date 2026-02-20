import { SQLiteDatabase } from 'expo-sqlite';

import {
  getAllCards,
  getCardById,
  insertCard,
  updateCard,
  deleteCard,
  upsertCard,
  deleteAllCards,
  getCardCount
} from './card-repository';
import { LoyaltyCard } from '../schemas';
import * as databaseModule from './database';

type TestCardRow = {
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
};

const makeDb = (rows: Array<Partial<TestCardRow> | { count: number }> = []): SQLiteDatabase =>
  ({
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn().mockResolvedValue(rows[0] ?? null),
    runAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn(
      async (fn: (...args: unknown[]) => Promise<unknown>) => await fn()
    )
  }) as unknown as SQLiteDatabase;

describe('card-repository', () => {
  afterEach(() => jest.restoreAllMocks());
  const sampleRow = {
    id: '1',
    name: 'Card A',
    barcode: '12345',
    barcode_format: 'ean13',
    brand_id: 'brand1',
    color: '#ffffff',
    is_favorite: 1,
    last_used_at: null,
    usage_count: 2,
    created_at: '2020-01-01',
    updated_at: '2020-01-02'
  };

  const sampleCard: LoyaltyCard = {
    id: '1',
    name: 'Card A',
    barcode: '12345',
    barcodeFormat: 'EAN13',
    brandId: 'brand1',
    color: 'green',
    isFavorite: true,
    lastUsedAt: null,
    usageCount: 2,
    createdAt: '2020-01-01',
    updatedAt: '2020-01-02'
  };

  test('getAllCards maps rows to domain objects', async () => {
    const db = makeDb([sampleRow]);
    const cards = await getAllCards(db);
    expect(db.getAllAsync).toHaveBeenCalled();
    expect(cards).toHaveLength(1);
    expect(cards[0]!.id).toBe(sampleRow.id);
    expect(cards[0]!.isFavorite).toBe(true);
  });

  test('getCardById returns card when found and null when missing', async () => {
    const dbFound = makeDb([sampleRow]);
    const found = await getCardById('1', dbFound);
    expect(dbFound.getFirstAsync).toHaveBeenCalled();
    expect(found).not.toBeNull();

    const dbMissing = makeDb([]);
    const missing = await getCardById('2', dbMissing);
    expect(missing).toBeNull();
  });

  test('insertCard, updateCard, deleteCard, upsertCard and deleteAllCards call DB methods', async () => {
    const db = makeDb();
    await insertCard(sampleCard, db);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    (db.runAsync as jest.Mock).mockClear();
    await updateCard(sampleCard, db);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    (db.runAsync as jest.Mock).mockClear();
    await upsertCard(sampleCard, db);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    (db.runAsync as jest.Mock).mockClear();
    await deleteCard('1', db);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    (db.runAsync as jest.Mock).mockClear();
    await deleteAllCards(db);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM loyalty_cards');
  });

  test('getCardCount returns numeric count', async () => {
    const db = makeDb([{ count: 5 }]);
    const count = await getCardCount(db);
    expect(db.getFirstAsync).toHaveBeenCalled();
    expect(count).toBe(5);
  });

  test('uses default getDatabase when no db supplied', async () => {
    const db = makeDb([sampleRow]);
    const spy = jest.spyOn(databaseModule, 'getDatabase').mockReturnValue(db);
    const cards = await getAllCards();
    expect(spy).toHaveBeenCalled();
    expect(db.getAllAsync).toHaveBeenCalled();
    expect(cards[0]!.id).toBe(sampleRow.id);
  });

  test('other functions use default getDatabase when no db supplied', async () => {
    const db = makeDb([sampleRow]);
    const spy = jest.spyOn(databaseModule, 'getDatabase').mockReturnValue(db);

    // getCardById
    const found = await getCardById('1');
    expect(spy).toHaveBeenCalled();
    expect(db.getFirstAsync).toHaveBeenCalled();
    expect(found?.id).toBe(sampleRow.id);

    // insertCard
    (db.getFirstAsync as jest.Mock).mockClear();
    (db.runAsync as jest.Mock).mockClear();
    await insertCard(sampleCard);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    // updateCard
    (db.runAsync as jest.Mock).mockClear();
    await updateCard(sampleCard);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    // upsertCard
    (db.runAsync as jest.Mock).mockClear();
    await upsertCard(sampleCard);
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    // deleteCard
    (db.runAsync as jest.Mock).mockClear();
    await deleteCard('1');
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalled();

    // deleteAllCards
    (db.runAsync as jest.Mock).mockClear();
    await deleteAllCards();
    expect(db.withTransactionAsync).toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalledWith('DELETE FROM loyalty_cards');

    // getCardCount
    (db.getFirstAsync as jest.Mock).mockClear();
    (db.getFirstAsync as jest.Mock).mockResolvedValueOnce({ count: 7 });
    const count = await getCardCount();
    expect(db.getFirstAsync).toHaveBeenCalled();
    expect(count).toBe(7);
  });
});
