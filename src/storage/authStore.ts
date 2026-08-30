import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

export type LocalAccount = {
  name: string;
  email: string;
};

type AccountRow = {
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
};

const SESSION_KEY = 'active_user_email';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('lakbaylokal.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
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
      `);
      return db;
    });
  }

  return databasePromise;
}

export async function registerLocalAccount(name: string, email: string, password: string): Promise<LocalAccount> {
  const db = await getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.getFirstAsync<{ email: string }>(
    'SELECT email FROM local_accounts WHERE email = ?',
    normalizedEmail,
  );

  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const salt = bytesToHex(await Crypto.getRandomBytesAsync(16));
  const passwordHash = await hashPassword(password, salt);

  await db.runAsync(
    `INSERT INTO local_accounts (email, name, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    normalizedEmail,
    name.trim(),
    passwordHash,
    salt,
    Date.now(),
  );

  return { name: name.trim(), email: normalizedEmail };
}

export async function authenticateLocalAccount(email: string, password: string): Promise<LocalAccount> {
  const db = await getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const account = await db.getFirstAsync<AccountRow>(
    'SELECT name, email, password_hash, password_salt FROM local_accounts WHERE email = ?',
    normalizedEmail,
  );

  if (!account) {
    throw new Error('Incorrect email or password.');
  }

  const passwordHash = await hashPassword(password, account.password_salt);
  if (passwordHash !== account.password_hash) {
    throw new Error('Incorrect email or password.');
  }

  return { name: account.name, email: account.email };
}

export async function getSessionEmail(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    SESSION_KEY,
  );
  return row?.value ?? null;
}

export async function saveSessionEmail(email: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
    SESSION_KEY,
    email.trim().toLowerCase(),
  );
}

export async function clearSession() {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM app_meta WHERE key = ?', SESSION_KEY);
}

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${password}`,
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
