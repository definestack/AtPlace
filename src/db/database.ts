import * as SQLite from "expo-sqlite";

const DATABASE_NAME = "atplace.db";

type Migration = (db: SQLite.SQLiteDatabase) => Promise<void>;

/**
 * Ordered, additive schema migrations. Each entry's index + 1 is the
 * `user_version` it upgrades the database *to* — e.g. `migrations[0]` takes a
 * fresh database from version 0 to version 1. Per CLAUDE.md: migrations are
 * explicit functions, never drop user tables, and new columns must ship with
 * sensible defaults.
 */
const migrations: Migration[] = [
  // v1: initial `places` table.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS places (
        id         TEXT PRIMARY KEY NOT NULL,
        name       TEXT NOT NULL,
        address    TEXT,
        latitude   REAL NOT NULL,
        longitude  REAL NOT NULL,
        icon       TEXT NOT NULL,
        color      TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  },
  // v2: `reminders` table (issue #8), linked to `places` via `place_id`.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS reminders (
        id         TEXT PRIMARY KEY NOT NULL,
        place_id   TEXT NOT NULL REFERENCES places(id),
        title      TEXT NOT NULL,
        trigger    TEXT NOT NULL,
        enabled    INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      );
    `);
  },
  // v3: geofence trigger radius on `places` (issue #10). Additive column with
  // a sensible default so existing places keep working unchanged.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE places ADD COLUMN radius REAL NOT NULL DEFAULT 150;
    `);
  },
  // v4: `logs` table (issue #37) — persistent record of geofence triggers,
  // notification deliveries/suppressions, and exceptions, written even when
  // the app is closed, so background-only notification failures can be
  // diagnosed from Settings > Event Log.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS logs (
        id         TEXT PRIMARY KEY NOT NULL,
        category   TEXT NOT NULL,
        message    TEXT NOT NULL,
        detail     TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    `);
  },
];

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const { user_version: currentVersion } = (await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  )) ?? { user_version: 0 };

  for (let version = currentVersion; version < migrations.length; version += 1) {
    await migrations[version](db);
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

/**
 * Opens (and lazily migrates) the app's SQLite database. Memoized so the
 * database is only opened and migrated once per process lifetime.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}
