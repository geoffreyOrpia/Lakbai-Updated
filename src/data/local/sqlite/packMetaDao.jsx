import { getDatabase } from "./database.jsx";
export const createPackMetaDao = () => {
  return {
    upsert: async meta => {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO pack_library (pack_id, version, updated_at, downloaded_at)
         VALUES (?, ?, ?, ?)`, meta.packId, meta.version, meta.updatedAt, meta.savedAt);
    },
    get: async packId => {
      const db = await getDatabase();
      const row = await db.getFirstAsync('SELECT * FROM pack_library WHERE pack_id = ?', packId);
      return row ? rowToMeta(row) : null;
    },
    list: async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync('SELECT * FROM pack_library ORDER BY downloaded_at DESC');
      return rows.map(rowToMeta);
    },
    remove: async packId => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM pack_library WHERE pack_id = ?', packId);
    }
  };
};
const rowToMeta = row => {
  return {
    packId: row.pack_id,
    version: row.version,
    updatedAt: row.updated_at,
    savedAt: row.downloaded_at
  };
};
