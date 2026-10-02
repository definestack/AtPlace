/**
 * Tests the v8 migration (issue #100): per-reminder `delay_minutes`, backfilled
 * from the legacy global Arrival/Leave Delay AsyncStorage keys. `expo-sqlite`
 * is automocked (no real native module involved); the database module itself
 * is freshly `require`d per test (via `jest.resetModules`) since `getDatabase`
 * memoizes its connection at module scope — hence the `require` calls below
 * instead of static imports, which a single `jest.resetModules()` can't
 * invalidate.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("expo-sqlite");
// The real package exposes its API as a `.default` export (confirmed via the
// production code's `require(...).default`, since Metro/CJS `require` — used
// for the migration's lazy load — bypasses Babel's ESM-import interop that
// `import AsyncStorage from "..."` elsewhere relies on). The jest mock file
// doesn't shape itself that way, so it's wrapped here to match.
jest.mock("@react-native-async-storage/async-storage", () => {
  const mock = jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock");
  return { ...mock, default: mock };
});

const ARRIVAL_KEY = "atplace.arrivalDelayMinutes";
const LEAVE_KEY = "atplace.leaveDelayMinutes";

type FakeDb = {
  execAsync: jest.Mock;
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
};

function createFakeDb(userVersion: number): FakeDb {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    runAsync: jest.fn().mockResolvedValue({ changes: 0 }),
    getFirstAsync: jest.fn().mockResolvedValue({ user_version: userVersion }),
  };
}

/** Fresh module graph per call so `getDatabase`'s module-scoped memoization never leaks between tests. */
async function openAtVersion(userVersion: number): Promise<FakeDb> {
  const SQLite = require("expo-sqlite");
  const fakeDb = createFakeDb(userVersion);
  (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(fakeDb);

  const { getDatabase } = require("@/db/database");
  await getDatabase();
  return fakeDb;
}

describe("database v8 migration (per-reminder notification delay)", () => {
  beforeEach(async () => {
    jest.resetModules();
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await AsyncStorage.clear();
  });

  it("adds the delay_minutes column and backfills from stored legacy delays", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem(ARRIVAL_KEY, "5");
    await AsyncStorage.setItem(LEAVE_KEY, "1");

    // Start just below v8 so only the v8 migration itself runs.
    const fakeDb = await openAtVersion(7);

    expect(fakeDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE reminders ADD COLUMN delay_minutes INTEGER NOT NULL DEFAULT 0"),
    );
    expect(fakeDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE reminders SET delay_minutes = \? WHERE trigger = 'arrive'/),
      5,
    );
    expect(fakeDb.runAsync).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE reminders SET delay_minutes = \? WHERE trigger = 'leave'/),
      1,
    );
  });

  it("falls back to the old 3-minute default when no legacy value was stored", async () => {
    const fakeDb = await openAtVersion(7);

    expect(fakeDb.runAsync).toHaveBeenCalledWith(expect.stringContaining("trigger = 'arrive'"), 3);
    expect(fakeDb.runAsync).toHaveBeenCalledWith(expect.stringContaining("trigger = 'leave'"), 3);
  });

  it("falls back to 3 minutes for a corrupted/out-of-range stored value", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem(ARRIVAL_KEY, "not-a-number");
    await AsyncStorage.setItem(LEAVE_KEY, "999");

    const fakeDb = await openAtVersion(7);

    expect(fakeDb.runAsync).toHaveBeenCalledWith(expect.stringContaining("trigger = 'arrive'"), 3);
    expect(fakeDb.runAsync).toHaveBeenCalledWith(expect.stringContaining("trigger = 'leave'"), 3);
  });

  it("removes the legacy AsyncStorage keys after a successful backfill", async () => {
    const AsyncStorage = require("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem(ARRIVAL_KEY, "5");
    await AsyncStorage.setItem(LEAVE_KEY, "1");

    await openAtVersion(7);

    expect(await AsyncStorage.getItem(ARRIVAL_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(LEAVE_KEY)).toBeNull();
  });

  it("does not re-run any migration when the database is already at the latest version", async () => {
    const fakeDb = await openAtVersion(8);

    expect(fakeDb.execAsync).not.toHaveBeenCalled();
    expect(fakeDb.runAsync).not.toHaveBeenCalled();
  });

  it("runs the v8 migration alongside earlier ones for a fresh (v0) database", async () => {
    const fakeDb = await openAtVersion(0);

    // Every migration ran, including the delay backfill.
    expect(fakeDb.execAsync).toHaveBeenCalledWith(expect.stringContaining("delay_minutes"));
    expect(fakeDb.runAsync).toHaveBeenCalledWith(expect.stringContaining("trigger = 'arrive'"), 3);
  });
});
