import { SQLiteDatabase } from 'expo-sqlite';

import { DB_VERSION } from './migrations';
import * as migrations from './migrations';

type MockDb = {
  getFirstAsync: jest.Mock<Promise<{ user_version: number } | null>, [string?]>;
  execAsync: jest.Mock<Promise<void>, [string]>;
};

const makeDb = (userVersion: number | null = null): MockDb => ({
  getFirstAsync: jest
    .fn()
    .mockResolvedValue(userVersion === null ? null : { user_version: userVersion }),
  execAsync: jest.fn().mockResolvedValue(undefined)
});

describe('migrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getDbVersion returns numeric version or 0 when missing', async () => {
    const dbWith = makeDb(2);
    const v = await migrations.getDbVersion(dbWith as unknown as SQLiteDatabase);
    expect(v).toBe(2);

    const dbNull = makeDb(null);
    const v2 = await migrations.getDbVersion(dbNull as unknown as SQLiteDatabase);
    expect(v2).toBe(0);
  });

  test('setDbVersion calls execAsync with PRAGMA', async () => {
    const db = makeDb(0);
    await migrations.setDbVersion(db as unknown as SQLiteDatabase, DB_VERSION);
    expect(db.execAsync).toHaveBeenCalledWith(`PRAGMA user_version = ${DB_VERSION}`);
  });

  test('runMigrations for fresh install (version 0) creates schema and sets version', async () => {
    const db = makeDb(0);
    await migrations.runMigrations(db as unknown as SQLiteDatabase);
    // execAsync is used for schema creation and setting version
    expect(db.execAsync).toHaveBeenCalled();
    const calledWithPragma = db.execAsync.mock.calls.some(
      (c) => typeof c[0] === 'string' && c[0].includes('PRAGMA user_version')
    );
    expect(calledWithPragma).toBe(true);
  });

  test('runMigrations for existing version calls setDbVersion', async () => {
    const db = makeDb(1);
    await migrations.runMigrations(db as unknown as SQLiteDatabase);
    // Should set DB version at the end
    expect(db.execAsync).toHaveBeenCalledWith(`PRAGMA user_version = ${DB_VERSION}`);
  });
});
