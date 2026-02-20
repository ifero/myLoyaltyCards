jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn()
}));

jest.mock('./migrations', () => ({
  DB_NAME: 'myloyaltycards.db',
  runMigrations: jest.fn().mockResolvedValue(undefined)
}));

import { openDatabaseAsync } from 'expo-sqlite';

import { initializeDatabase, getDatabase, closeDatabase, resetDatabaseSingleton } from './database';
import { runMigrations } from './migrations';

type MockDb = {
  getFirstAsync: jest.Mock<Promise<{ user_version: number } | null>, [string?]>;
  execAsync: jest.Mock<Promise<void>, [string]>;
  closeAsync: jest.Mock<Promise<void>, []>;
};

const makeDb = (): MockDb => ({
  execAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue({ user_version: 1 }),
  closeAsync: jest.fn().mockResolvedValue(undefined)
});

describe('database module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDatabaseSingleton();
  });

  test('getDatabase throws when not initialized', () => {
    expect(() => getDatabase()).toThrow(/Database not initialized/);
  });

  test('initializeDatabase opens DB and runs migrations, getDatabase returns instance', async () => {
    const fakeDb = makeDb();
    (openDatabaseAsync as jest.Mock).mockResolvedValue(fakeDb);

    const db = await initializeDatabase();
    expect(openDatabaseAsync).toHaveBeenCalled();
    expect(runMigrations).toHaveBeenCalledWith(fakeDb);

    const db2 = getDatabase();
    expect(db2).toBe(db);
  });

  test('closeDatabase closes and resets singleton', async () => {
    const fakeDb = makeDb();
    (openDatabaseAsync as jest.Mock).mockResolvedValue(fakeDb);

    await initializeDatabase();
    await closeDatabase();

    expect(fakeDb.closeAsync).toHaveBeenCalled();
    expect(() => getDatabase()).toThrow();
  });
});
