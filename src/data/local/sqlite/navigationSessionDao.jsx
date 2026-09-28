import { getDatabase } from "./database.jsx";

const ACTIVE_NAVIGATION_KEY = 'active_navigation_session';

export const createNavigationSessionDao = () => ({
  save: async session => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      ACTIVE_NAVIGATION_KEY,
      JSON.stringify(session),
    );
  },
  get: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT value FROM app_meta WHERE key = ?',
      ACTIVE_NAVIGATION_KEY,
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
    await db.runAsync('DELETE FROM app_meta WHERE key = ?', ACTIVE_NAVIGATION_KEY);
  },
});
