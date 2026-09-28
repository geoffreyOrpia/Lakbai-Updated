import { getDatabase } from "./database.jsx";

const DISCOVERY_STATE_KEY = 'offline_discovery_state';
const EMPTY_STATE = Object.freeze({ recents: [], pins: [] });

export const createDiscoveryStateDao = () => ({
  get: async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync(
      'SELECT value FROM app_meta WHERE key = ?',
      DISCOVERY_STATE_KEY,
    );
    if (!row?.value) return { ...EMPTY_STATE };
    try {
      const parsed = JSON.parse(row.value);
      return {
        recents: Array.isArray(parsed?.recents) ? parsed.recents : [],
        pins: Array.isArray(parsed?.pins) ? parsed.pins : [],
      };
    } catch {
      return { ...EMPTY_STATE };
    }
  },
  save: async state => {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      DISCOVERY_STATE_KEY,
      JSON.stringify({
        recents: Array.isArray(state?.recents) ? state.recents : [],
        pins: Array.isArray(state?.pins) ? state.pins : [],
      }),
    );
  },
});
