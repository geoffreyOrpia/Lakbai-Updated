import * as SQLite from 'expo-sqlite';

export type ItineraryStop = {
  destinationId: string;
  destinationName: string;
  municipality: string;
  plannedTime: string;
  note: string;
};

export type Itinerary = {
  id: string;
  ownerKey: string;
  title: string;
  travelDate: string;
  notes: string;
  stops: ItineraryStop[];
  createdAt: number;
  updatedAt: number;
};

type ItineraryRow = {
  id: string;
  owner_key: string;
  title: string;
  travel_date: string;
  notes: string;
  stops_json: string;
  created_at: number;
  updated_at: number;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS itineraries (
          id TEXT PRIMARY KEY NOT NULL,
          owner_key TEXT NOT NULL,
          title TEXT NOT NULL,
          travel_date TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          stops_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_itineraries_owner_date
          ON itineraries (owner_key, travel_date);
      `);
      return db;
    });
  }

  return databasePromise;
}

export async function listItineraries(ownerKey: string): Promise<Itinerary[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ItineraryRow>(
    'SELECT * FROM itineraries WHERE owner_key = ? ORDER BY travel_date ASC, created_at DESC',
    ownerKey,
  );

  return rows.map(rowToItinerary);
}

export async function saveItinerary(itinerary: Itinerary) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO itineraries
      (id, owner_key, title, travel_date, notes, stops_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    itinerary.id,
    itinerary.ownerKey,
    itinerary.title,
    itinerary.travelDate,
    itinerary.notes,
    JSON.stringify(itinerary.stops),
    itinerary.createdAt,
    itinerary.updatedAt,
  );
}

export async function deleteItinerary(id: string, ownerKey: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM itineraries WHERE id = ? AND owner_key = ?', id, ownerKey);
}

function rowToItinerary(row: ItineraryRow): Itinerary {
  let stops: ItineraryStop[] = [];

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
    updatedAt: row.updated_at,
  };
}
