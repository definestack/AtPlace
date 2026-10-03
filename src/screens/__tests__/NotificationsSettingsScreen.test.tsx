import { render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";

import { NotificationsSettingsScreen } from "@/screens/NotificationsSettingsScreen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock("@/store/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({
      notificationsEnabled: true,
      setNotificationsEnabled: jest.fn(),
      notificationSound: true,
      setNotificationSound: jest.fn(),
      notificationVibration: true,
      setNotificationVibration: jest.fn(),
    }),
}));

jest.mock("@/services/notifications", () => ({
  openExactAlarmSettings: jest.fn(),
}));

describe("NotificationsSettingsScreen", () => {
  it("no longer shows the removed global Arrival/Leave Delay rows (issue #100)", async () => {
    await render(<NotificationsSettingsScreen />);

    expect(screen.queryByText("Arrival Delay")).toBeNull();
    expect(screen.queryByText("Leave Delay")).toBeNull();
  });

  it("still shows the enable/sound/vibration rows", async () => {
    await render(<NotificationsSettingsScreen />);

    expect(screen.getByText("Enable notifications")).toBeTruthy();
    expect(screen.getByText("Sound")).toBeTruthy();
    expect(screen.getByText("Vibration")).toBeTruthy();
  });

  it("hides the exact-alarm row on platforms below Android 14", async () => {
    const originalOS = Platform.OS;
    const originalVersion = Platform.Version;
    Object.defineProperty(Platform, "OS", { get: () => "android" });
    Object.defineProperty(Platform, "Version", { get: () => 30 });

    await render(<NotificationsSettingsScreen />);
    expect(screen.queryByText("Exact timing")).toBeNull();

    Object.defineProperty(Platform, "OS", { get: () => originalOS });
    Object.defineProperty(Platform, "Version", { get: () => originalVersion });
  });
});
