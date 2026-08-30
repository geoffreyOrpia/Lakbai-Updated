import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS downloaded_packs (
          pack_id TEXT PRIMARY KEY NOT NULL,
          downloaded_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);

      const seedState = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'downloads_seeded'",
      );

      if (!seedState) {
        await db.runAsync(
          'INSERT OR IGNORE INTO downloaded_packs (pack_id, downloaded_at) VALUES (?, ?)',
          'samal',
          Date.now(),
        );
        await db.runAsync(
          "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('downloads_seeded', '1')",
        );
      }

      return db;
    });
  }

  return databasePromise;
}

export async function listDownloadedPackIds(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ pack_id: string }>(
    'SELECT pack_id FROM downloaded_packs ORDER BY downloaded_at DESC',
  );
  return rows.map((row) => row.pack_id);
}

export async function saveDownloadedPack(packId: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO downloaded_packs (pack_id, downloaded_at) VALUES (?, ?)',
    packId,
    Date.now(),
  );
}

export async function removeDownloadedPack(packId: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM downloaded_packs WHERE pack_id = ?', packId);
}
