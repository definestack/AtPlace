import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_LOG_RETENTION_DAYS, getLogRetentionDays, useSettingsStore } from "@/store/settingsStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const LOG_RETENTION_KEY = "atplace.logRetentionDays";

describe("settingsStore log retention", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettingsStore.setState({ logRetentionDays: DEFAULT_LOG_RETENTION_DAYS, hydrated: false });
  });

  it("defaults to 5 days before hydration", () => {
    expect(useSettingsStore.getState().logRetentionDays).toBe(5);
  });

  it("hydrates a valid stored value as-is", async () => {
    await AsyncStorage.setItem(LOG_RETENTION_KEY, "10");

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().logRetentionDays).toBe(10);
  });

  it("clamps a stored value below the minimum up to 1", async () => {
    await AsyncStorage.setItem(LOG_RETENTION_KEY, "0");

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().logRetentionDays).toBe(1);
  });

  it("clamps a stored value above the maximum down to 15", async () => {
    await AsyncStorage.setItem(LOG_RETENTION_KEY, "99");

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().logRetentionDays).toBe(15);
  });

  it("falls back to the default for a non-numeric stored value", async () => {
    await AsyncStorage.setItem(LOG_RETENTION_KEY, "abc");

    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().logRetentionDays).toBe(5);
  });

  it("falls back to the default when nothing is stored", async () => {
    await useSettingsStore.getState().hydrate();

    expect(useSettingsStore.getState().logRetentionDays).toBe(5);
  });

  it("setLogRetentionDays clamps, persists and updates the store", async () => {
    useSettingsStore.getState().setLogRetentionDays(20);

    expect(useSettingsStore.getState().logRetentionDays).toBe(15);
    await Promise.resolve();
    expect(await AsyncStorage.getItem(LOG_RETENTION_KEY)).toBe("15");
  });

  describe("getLogRetentionDays", () => {
    it("reads from the live store once hydrated", async () => {
      useSettingsStore.setState({ hydrated: true, logRetentionDays: 7 });

      expect(await getLogRetentionDays()).toBe(7);
    });

    it("falls back to AsyncStorage before hydration", async () => {
      useSettingsStore.setState({ hydrated: false });
      await AsyncStorage.setItem(LOG_RETENTION_KEY, "12");

      expect(await getLogRetentionDays()).toBe(12);
    });
  });
});
