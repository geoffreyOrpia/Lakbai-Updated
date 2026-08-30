import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS safety_checklist (
          item_key TEXT PRIMARY KEY NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }

  return databasePromise;
}

export async function listCompletedSafetyItems(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ item_key: string }>(
    'SELECT item_key FROM safety_checklist WHERE completed = 1 ORDER BY updated_at DESC',
  );
  return rows.map((row) => row.item_key);
}

export async function setSafetyItemCompleted(itemKey: string, completed: boolean) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO safety_checklist (item_key, completed, updated_at)
     VALUES (?, ?, ?)`,
    itemKey,
    completed ? 1 : 0,
    Date.now(),
  );
}

export async function resetSafetyChecklist() {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM safety_checklist');
}
