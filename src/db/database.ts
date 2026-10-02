import * as SQLite from "expo-sqlite";

import { parseDelayMinutes } from "@/utils/delay";

const DATABASE_NAME = "atplace.db";

/**
 * Legacy global delay AsyncStorage keys (removed in issue #100 — delay is now
 * per-reminder). Read once by the v8 migration's backfill, then deleted.
 * Kept as local constants (not re-exported from `settingsStore`, which no
 * longer knows about them) so the migration is self-contained.
 */
const LEGACY_ARRIVAL_DELAY_KEY = "atplace.arrivalDelayMinutes";
const LEGACY_LEAVE_DELAY_KEY = "atplace.leaveDelayMinutes";

/** The old global default (Settings > Notifications > Arrival/Leave Delay) — see the v8 migration below. */
const LEGACY_DEFAULT_DELAY_MINUTES = 3;

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
  // v5: `notifications` table (issue #40) — the in-app Notifications inbox.
  // Place/reminder display fields are stored as a snapshot at delivery time
  // (not joined) so a row keeps rendering correctly even if the source
  // reminder/place is later edited or deleted; `reminder_id`/`place_id` are
  // nullable links back to the live data, not foreign keys.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id             TEXT PRIMARY KEY NOT NULL,
        reminder_id    TEXT,
        place_id       TEXT,
        reminder_title TEXT NOT NULL,
        place_name     TEXT NOT NULL,
        place_icon     TEXT NOT NULL,
        place_color    TEXT NOT NULL,
        trigger        TEXT NOT NULL,
        read           INTEGER NOT NULL DEFAULT 0,
        created_at     INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);
  },
  // v6: per-reminder notification sound/vibration overrides (issue #51).
  // Additive columns defaulted to 'default' (inherit the global Settings
  // toggle), so existing reminders keep their current behavior unchanged.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE reminders ADD COLUMN sound_override TEXT NOT NULL DEFAULT 'default';
      ALTER TABLE reminders ADD COLUMN vibration_override TEXT NOT NULL DEFAULT 'default';
    `);
  },
  // v7: one-time vs. repeating reminders (issue #53). Additive column
  // defaulted to 'repeating' — every existing reminder today re-fires on
  // every trigger, so defaulting to 'once' would silently auto-disable them
  // after their next trigger. New reminders explicitly write 'once' (the
  // ticket's default) via `insertReminder`, so this DEFAULT only applies to
  // rows that existed before this migration ran.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE reminders ADD COLUMN repeat TEXT NOT NULL DEFAULT 'repeating';
    `);
  },
  // v8: per-reminder notification delay (issue #100), replacing the global
  // Arrival Delay / Leave Delay settings. Additive column defaulted to 0
  // ("Immediately") so the ALTER itself never loses data; the backfill right
  // after gives existing reminders the delay they were actually using under
  // the old global settings, read from AsyncStorage (the global values never
  // lived in SQLite). This runs once, guarded by `user_version` like every
  // other migration here, and must complete before `settingsStore` deletes
  // the legacy keys — which is why the deletion happens here, not there.
  //
  // `AsyncStorage` is `require`d lazily (rather than imported at module
  // scope) so that tests which automock this module
  // (`jest.mock("@/db/database")`, used by `placesRepository`/`logsRepository`
  // tests) don't have to load the real native AsyncStorage module just to
  // introspect this file's exports — only actually running a migration needs
  // it. A plain `require` (not a dynamic `import()`) since Metro/Jest here
  // run on CommonJS, not ESM.
  async (db) => {
    await db.execAsync(`
      ALTER TABLE reminders ADD COLUMN delay_minutes INTEGER NOT NULL DEFAULT 0;
    `);

    /* eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberately lazy, see comment above */
    const AsyncStorage: typeof import("@react-native-async-storage/async-storage").default = require(
      "@react-native-async-storage/async-storage",
    ).default;
    const [storedArrival, storedLeave] = await Promise.all([
      AsyncStorage.getItem(LEGACY_ARRIVAL_DELAY_KEY),
      AsyncStorage.getItem(LEGACY_LEAVE_DELAY_KEY),
    ]);
    // Unset/invalid falls back to 3 min — the old global default those
    // reminders were actually running under, not "Immediately".
    const arrivalDelay = parseDelayMinutes(storedArrival) ?? LEGACY_DEFAULT_DELAY_MINUTES;
    const leaveDelay = parseDelayMinutes(storedLeave) ?? LEGACY_DEFAULT_DELAY_MINUTES;

    await db.runAsync("UPDATE reminders SET delay_minutes = ? WHERE trigger = 'arrive'", arrivalDelay);
    await db.runAsync("UPDATE reminders SET delay_minutes = ? WHERE trigger = 'leave'", leaveDelay);

    // Best-effort cleanup — a failure here must never block the DB from
    // opening; the keys are already orphaned from the app's perspective
    // either way since `settingsStore` no longer reads them.
    try {
      await AsyncStorage.multiRemove([LEGACY_ARRIVAL_DELAY_KEY, LEGACY_LEAVE_DELAY_KEY]);
    } catch {
      // Ignored — see above.
    }
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
