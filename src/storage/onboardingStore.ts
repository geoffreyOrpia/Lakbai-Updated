import * as SQLite from 'expo-sqlite';

const ONBOARDING_KEY = 'onboarding_completed';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      return db;
    });
  }

  return databasePromise;
}

export async function hasCompletedOnboarding() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    ONBOARDING_KEY,
  );
  return row?.value === '1';
}

export async function completeOnboarding() {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    ONBOARDING_KEY,
    '1',
  );
}
