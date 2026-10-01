import { ensureBundledContent } from "./database.jsx";
export const createPackContentDao = () => {
  return {
    get: async packId => {
      const db = await ensureBundledContent();
      const row = await db.getFirstAsync('SELECT payload_json FROM bundled_packs WHERE pack_id = ?', packId);
      return row ? parsePack(row.payload_json) : null;
    },
    listManifests: async () => {
      const db = await ensureBundledContent();
      const rows = await db.getAllAsync(`SELECT pack_id, version, updated_at, size_kb,
           name, municipality, category, trails_count, route_suggestions_count,
           spots_count, withheld_trails_count
         FROM bundled_packs ORDER BY pack_id`);
      return rows.map(row => ({
        id: row.pack_id,
        name: row.name,
        municipality: row.municipality,
        category: row.category,
        version: row.version,
        updatedAt: row.updated_at,
        sizeKb: row.size_kb,
        trailsCount: row.trails_count,
        routeSuggestionsCount: row.route_suggestions_count,
        spotsCount: row.spots_count,
        withheldTrailsCount: row.withheld_trails_count,
      }));
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
