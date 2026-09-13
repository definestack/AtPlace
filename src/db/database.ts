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
