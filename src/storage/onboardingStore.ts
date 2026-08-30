import * as SQLite from 'expo-sqlite';

import type { DestinationCategory } from '../data/destinations';

export type TravelPace = 'relaxed' | 'balanced' | 'active';

export type SignupOnboardingPreferences = {
  interests: DestinationCategory[];
  travelPace: TravelPace;
  offlineReminder: boolean;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS signup_onboarding (
          email TEXT PRIMARY KEY NOT NULL,
          interests_json TEXT NOT NULL,
          travel_pace TEXT NOT NULL,
          offline_reminder INTEGER NOT NULL DEFAULT 1,
          completed_at INTEGER NOT NULL
        );
      `);
      return db;
    });
  }

  return databasePromise;
}

export async function hasCompletedSignupOnboarding(email: string) {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ email: string }>(
    'SELECT email FROM signup_onboarding WHERE email = ?',
    email.trim().toLowerCase(),
  );
  return Boolean(row);
}

export async function saveSignupOnboarding(email: string, preferences: SignupOnboardingPreferences) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO signup_onboarding
      (email, interests_json, travel_pace, offline_reminder, completed_at)
      VALUES (?, ?, ?, ?, ?)`,
    email.trim().toLowerCase(),
    JSON.stringify(preferences.interests),
    preferences.travelPace,
    preferences.offlineReminder ? 1 : 0,
    Date.now(),
  );
}
