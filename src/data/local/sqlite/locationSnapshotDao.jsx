import { getDatabase } from "./database.jsx";

const LOCATION_SNAPSHOT_KEY = 'recent_location_snapshot';

export const createLocationSnapshotDao = () => ({
  save: async fix => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      LOCATION_SNAPSHOT_KEY,
      JSON.stringify(fix),
    );
  },
  get: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT value FROM app_meta WHERE key = ?',
      LOCATION_SNAPSHOT_KEY,
    );
    if (!row?.value) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return null;
    }
  },
  clear: async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_meta WHERE key = ?', LOCATION_SNAPSHOT_KEY);
  },
});
