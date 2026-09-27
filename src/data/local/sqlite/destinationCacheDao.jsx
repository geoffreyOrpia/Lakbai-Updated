import { getDatabase } from "./database.jsx";
export const createDestinationCacheDao = () => {
  return {
    replaceAll: async destinations => {
      const db = await getDatabase();
      const syncedAt = Date.now();
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM cached_destinations');
        for (const destination of destinations) {
          await db.runAsync('INSERT OR REPLACE INTO cached_destinations (id, payload_json, synced_at) VALUES (?, ?, ?)', destination.id, JSON.stringify(destination), syncedAt);
        }
      });
    },
    listAll: async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync('SELECT * FROM cached_destinations');
      return rows.map(row => parseDestination(row.payload_json)).filter(destination => destination !== null);
    },
    get: async id => {
      const db = await getDatabase();
      const row = await db.getFirstAsync('SELECT * FROM cached_destinations WHERE id = ?', id);
      return row ? parseDestination(row.payload_json) : null;
    }
  };
};
const parseDestination = payload => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
