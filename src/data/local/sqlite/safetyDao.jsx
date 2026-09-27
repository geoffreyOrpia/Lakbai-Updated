import { getDatabase } from "./database.jsx";
export const createSafetyDao = () => {
  return {
    listCompletedKeys: async () => {
      const db = await getDatabase();
      const rows = await db.getAllAsync('SELECT item_key FROM safety_checklist WHERE completed = 1 ORDER BY updated_at DESC');
      return rows.map(row => row.item_key);
    },
    setCompleted: async (itemKey, completed) => {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO safety_checklist (item_key, completed, updated_at)
         VALUES (?, ?, ?)`, itemKey, completed ? 1 : 0, Date.now());
    },
    reset: async () => {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM safety_checklist');
    }
  };
};
