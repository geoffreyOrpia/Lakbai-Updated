import { getDatabase } from "./database.jsx";
export const createPackContentDao = () => {
  return {
    get: async packId => {
      const db = await getDatabase();
      const row = await db.getFirstAsync('SELECT payload_json FROM bundled_packs WHERE pack_id = ?', packId);
      return row ? parsePack(row.payload_json) : null;
    },
    listManifests: async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync(`SELECT pack_id, payload_json, version, updated_at, size_kb
         FROM bundled_packs ORDER BY pack_id`);
      return rows.flatMap(row => {
        const pack = parsePack(row.payload_json);
        if (!pack) return [];
        return [{
          id: row.pack_id,
          name: pack.destination.name,
          municipality: pack.destination.municipality,
          category: pack.destination.category,
          version: row.version,
          updatedAt: row.updated_at,
          sizeKb: row.size_kb,
          trailsCount: pack.trails.length,
          spotsCount: pack.spots.length
        }];
      });
    }
  };
};
const parsePack = payload => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};
