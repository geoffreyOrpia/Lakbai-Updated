describe('database bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('opening SQLite for personal data does not load bundled tourism content', async () => {
    const db = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([]),
      getFirstAsync: jest.fn(async query => {
        if (String(query).includes('PRAGMA user_version')) return { user_version: 4 };
        if (String(query).includes('bundled_catalog_version')) {
          return { value: 'older-catalog' };
        }
        return null;
      }),
      withTransactionAsync: jest.fn(async callback => callback()),
      runAsync: jest.fn().mockResolvedValue(undefined),
    };
    const openDatabaseAsync = jest.fn().mockResolvedValue(db);
    const catalogFactory = jest.fn(() => ({
      seedDestinations: [],
      seedPacks: [],
    }));

    jest.doMock('expo-sqlite', () => ({ openDatabaseAsync }));
    jest.doMock('../src/data/local/seed/catalog.jsx', catalogFactory);

    const { getDatabase, ensureBundledContent } = require('../src/data/local/sqlite/database.jsx');

    await getDatabase();

    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(catalogFactory).not.toHaveBeenCalled();

    await ensureBundledContent();

    expect(catalogFactory).toHaveBeenCalledTimes(1);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
  });

  test('metadata migration skips columns already added by an interrupted run', async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const db = {
      execAsync,
      getAllAsync: jest.fn().mockResolvedValue([{ name: 'name' }]),
      getFirstAsync: jest.fn(async query => {
        if (String(query).includes('PRAGMA user_version')) return { user_version: 4 };
        return null;
      }),
    };
    const openDatabaseAsync = jest.fn().mockResolvedValue(db);
    jest.doMock('expo-sqlite', () => ({ openDatabaseAsync }));

    const { getDatabase } = require('../src/data/local/sqlite/database.jsx');
    await getDatabase();

    const migrationSql = execAsync.mock.calls.map(([sql]) => String(sql));
    expect(migrationSql.some(sql => sql.includes('ADD COLUMN name '))).toBe(false);
    expect(migrationSql.some(sql => sql.includes('ADD COLUMN municipality '))).toBe(true);
    expect(migrationSql).toContain('PRAGMA user_version = 5');
  });
});
