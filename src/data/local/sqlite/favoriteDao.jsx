import { getDatabase } from "./database.jsx";

export const createFavoriteDao = () => ({
  list: async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync('SELECT destination_id FROM favorite_destinations ORDER BY favorited_at DESC');
    return rows.map(row => row.destination_id);
  },
  has: async destinationId => {
    const db = await getDatabase();
    const row = await db.getFirstAsync('SELECT 1 AS found FROM favorite_destinations WHERE destination_id = ?', destinationId);
    return Boolean(row?.found);
  },
  set: async (destinationId, favorite) => {
    const db = await getDatabase();
    if (favorite) {
      await db.runAsync(
        'INSERT OR REPLACE INTO favorite_destinations (destination_id, favorited_at) VALUES (?, ?)',
        destinationId,
        Date.now(),
      );
      return;
    }
    await db.runAsync('DELETE FROM favorite_destinations WHERE destination_id = ?', destinationId);
  },
});
