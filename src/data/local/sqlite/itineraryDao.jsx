import { getDatabase } from "./database.jsx";
export const createItineraryDao = () => {
  return {
    list: async ownerKey => {
      const db = await getDatabase();
      const rows = await db.getAllAsync('SELECT * FROM itineraries WHERE owner_key = ? ORDER BY travel_date ASC, created_at DESC', ownerKey);
      return rows.map(rowToItinerary);
    },
    save: async itinerary => {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO itineraries
          (id, owner_key, title, travel_date, notes, stops_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, itinerary.id, itinerary.ownerKey, itinerary.title, itinerary.travelDate, itinerary.notes, JSON.stringify(itinerary.stops), itinerary.createdAt, itinerary.updatedAt);
    },
    remove: async (id, ownerKey) => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM itineraries WHERE id = ? AND owner_key = ?', id, ownerKey);
    }
  };
};
const rowToItinerary = row => {
  let stops = [];
  try {
    const parsed = JSON.parse(row.stops_json);
    if (Array.isArray(parsed)) {
      stops = parsed;
    }
  } catch {
    stops = [];
  }
  return {
    id: row.id,
    ownerKey: row.owner_key,
    title: row.title,
    travelDate: row.travel_date,
    notes: row.notes,
    stops,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};
