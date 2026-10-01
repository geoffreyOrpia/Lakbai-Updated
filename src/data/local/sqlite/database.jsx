import * as SQLite from 'expo-sqlite';
import { seedDestinations, seedPacks } from "../seed/catalog.jsx";

// Single SQLite connection for the whole app with versioned migrations.
// PRAGMA user_version drives the migration ladder.

const BUNDLED_CATALOG_VERSION = '2026-09-28.4';

let databasePromise = null;
export const getDatabase = () => {
  if (!databasePromise) {
    databasePromise = openDatabase().catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
};
const openDatabase = async () => {
  const db = await SQLite.openDatabaseAsync('lakbaylokal.db');
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion < 1) {
    await migrateToV1(db);
  }
  if (currentVersion < 2) {
    await migrateToV2(db);
  }
  if (currentVersion < 3) {
    await migrateToV3(db);
  }
  if (currentVersion < 4) {
    await migrateToV4(db);
  }
  await seedBundledContent(db);
  return db;
};
const migrateToV1 = async db => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS local_accounts (
      email TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS safety_checklist (
      item_key TEXT PRIMARY KEY NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_destinations (
      id TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pack_library (
      pack_id TEXT PRIMARY KEY NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT '',
      downloaded_at INTEGER NOT NULL
    );
  `);

  // The first prototype stored download state in `downloaded_packs(pack_id, downloaded_at)`.
  // Carry those rows into pack_library, then retire the legacy table.
  const legacy = await db.getFirstAsync("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'downloaded_packs'");
  if ((legacy?.count ?? 0) > 0) {
    await db.execAsync(`
      INSERT OR IGNORE INTO pack_library (pack_id, version, updated_at, downloaded_at)
        SELECT pack_id, 1, '', downloaded_at FROM downloaded_packs;
      DROP TABLE downloaded_packs;
    `);
  }
  await db.execAsync('PRAGMA user_version = 1');
};
const migrateToV2 = async db => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bundled_packs (
      pack_id TEXT PRIMARY KEY NOT NULL,
      payload_json TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      size_kb INTEGER NOT NULL
    );

    INSERT OR IGNORE INTO app_meta (key, value)
      SELECT 'travel_preferences', value
      FROM app_meta
      WHERE key LIKE 'onboarding:%'
      LIMIT 1;

    UPDATE itineraries SET owner_key = 'local-device';
    PRAGMA user_version = 2;
  `);
};
const migrateToV3 = async db => {
  await db.execAsync(`
    DROP TABLE IF EXISTS local_accounts;
    PRAGMA user_version = 3;
  `);
};
const migrateToV4 = async db => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS favorite_destinations (
      destination_id TEXT PRIMARY KEY NOT NULL,
      favorited_at INTEGER NOT NULL
    );
    PRAGMA user_version = 4;
  `);
};

const seedBundledContent = async db => {
  const catalogVersion = await db.getFirstAsync("SELECT value FROM app_meta WHERE key = 'bundled_catalog_version'");
  if (catalogVersion?.value === BUNDLED_CATALOG_VERSION) return;

  await db.withTransactionAsync(async () => {
    // Regenerate bundled catalog tables only when packaged content changes.
    // Personal trips, settings, and library state remain untouched.
    await db.runAsync('DELETE FROM cached_destinations');
    await db.runAsync('DELETE FROM bundled_packs');
    for (const destination of seedDestinations) {
      await db.runAsync(`INSERT OR REPLACE INTO cached_destinations (id, payload_json, synced_at)
         VALUES (?, ?, ?)`, destination.id, JSON.stringify(destination), 0);
    }
    for (const pack of seedPacks) {
      await db.runAsync(`INSERT OR REPLACE INTO bundled_packs
          (pack_id, payload_json, version, updated_at, size_kb)
         VALUES (?, ?, ?, ?, ?)`, pack.id, JSON.stringify(pack), pack.version, pack.updatedAt, pack.sizeKb);
    }
    await db.runAsync(`INSERT OR REPLACE INTO app_meta (key, value) VALUES ('bundled_catalog_version', ?)`, BUNDLED_CATALOG_VERSION);
  });
};
