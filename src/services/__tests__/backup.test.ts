import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import { deleteAllNotifications } from "@/db/notificationsRepository";
import { deleteAllPlaces, getAllPlaces, insertPlace } from "@/db/placesRepository";
import { deleteAllReminders, insertReminder } from "@/db/remindersRepository";
import { importData } from "@/services/backup";
import { useNotificationsStore } from "@/store/notificationsStore";
import { usePlacesStore } from "@/store/placesStore";
import { useRemindersStore } from "@/store/remindersStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";

jest.mock("expo-document-picker");
jest.mock("expo-file-system");
jest.mock("expo-sharing");
// Automocking `@/store/settingsStore` still loads the real module to infer
// its shape, which imports the native AsyncStorage module — mock that too,
// same as `settingsStore.test.ts`.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/db/notificationsRepository");
jest.mock("@/db/placesRepository");
jest.mock("@/db/remindersRepository");
jest.mock("@/store/notificationsStore");
jest.mock("@/store/placesStore");
jest.mock("@/store/remindersStore");
jest.mock("@/store/settingsStore");
jest.mock("@/store/themeStore");

const BASE_PLACE = {
  id: "place-1",
  name: "Office",
  address: undefined,
  latitude: 1,
  longitude: 2,
  icon: "briefcase-outline",
  color: "teal",
  radius: 150,
};

/** Stubs the picker + file read for one `importData` call with the given backup JSON body. */
function stubPickedBackup(payload: unknown): void {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file://backup.json" }],
  });
  (File as unknown as jest.Mock).mockImplementation(() => ({
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  (getAllPlaces as jest.Mock).mockResolvedValue([]);
  (deleteAllReminders as jest.Mock).mockResolvedValue(undefined);
  (deleteAllPlaces as jest.Mock).mockResolvedValue(undefined);
  (deleteAllNotifications as jest.Mock).mockResolvedValue(undefined);
  (insertPlace as jest.Mock).mockResolvedValue(undefined);
  (insertReminder as jest.Mock).mockResolvedValue(undefined);

  for (const store of [usePlacesStore, useRemindersStore, useNotificationsStore]) {
    (store.getState as jest.Mock).mockReturnValue({ hydrate: jest.fn().mockResolvedValue(undefined) });
  }
  (useSettingsStore.getState as jest.Mock).mockReturnValue({
    setUnits: jest.fn(),
    setNotificationsEnabled: jest.fn(),
    setNotificationSound: jest.fn(),
    setNotificationVibration: jest.fn(),
  });
  (useThemeStore.getState as jest.Mock).mockReturnValue({ setMode: jest.fn() });
});

describe("importData — per-reminder delay (issue #100)", () => {
  it("round-trips a reminder's delayMinutes", async () => {
    stubPickedBackup({
      version: 1,
      places: [BASE_PLACE],
      reminders: [
        {
          id: "r1",
          placeId: "place-1",
          title: "Take laptop",
          trigger: "arrive",
          enabled: true,
          sound: "default",
          vibration: "default",
          repeat: "once",
          delayMinutes: 5,
        },
      ],
    });

    await importData();

    expect(insertReminder).toHaveBeenCalledWith(expect.objectContaining({ id: "r1", delayMinutes: 5 }));
  });

  it("imports an older backup with no delayMinutes field as Immediately", async () => {
    stubPickedBackup({
      version: 1,
      places: [BASE_PLACE],
      reminders: [
        {
          id: "r1",
          placeId: "place-1",
          title: "Take laptop",
          trigger: "arrive",
          enabled: true,
          sound: "default",
          vibration: "default",
          repeat: "once",
          // no delayMinutes — predates issue #100
        },
      ],
    });

    await importData();

    expect(insertReminder).toHaveBeenCalledWith(expect.objectContaining({ id: "r1", delayMinutes: 0 }));
  });

  it("falls back to Immediately for an out-of-range delayMinutes value", async () => {
    stubPickedBackup({
      version: 1,
      places: [BASE_PLACE],
      reminders: [
        {
          id: "r1",
          placeId: "place-1",
          title: "Take laptop",
          trigger: "arrive",
          enabled: true,
          sound: "default",
          vibration: "default",
          repeat: "once",
          delayMinutes: 999,
        },
      ],
    });

    await importData();

    expect(insertReminder).toHaveBeenCalledWith(expect.objectContaining({ id: "r1", delayMinutes: 0 }));
  });
});
