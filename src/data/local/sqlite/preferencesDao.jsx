import { getDatabase } from "./database.jsx";
const PREFERENCES_KEY = 'travel_preferences';
export const createPreferencesDao = () => {
  return {
    save: async preferences => {
      const db = await getDatabase();
      await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', PREFERENCES_KEY, JSON.stringify(preferences));
    },
    get: async () => {
      const db = await getDatabase();
      const row = await db.getFirstAsync('SELECT value FROM app_meta WHERE key = ?', PREFERENCES_KEY);
      if (!row?.value) return null;
      try {
        return JSON.parse(row.value);
      } catch {
        return null;
      }
    },
    clear: async () => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM app_meta WHERE key = ?', PREFERENCES_KEY);
    }
  };
};
