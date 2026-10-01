import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Sharing from "expo-sharing";

import { LogsScreen } from "@/screens/LogsScreen";
import { deleteAllLogs, getRecentLogs } from "@/db/logsRepository";
import type { LogEntry } from "@/types/log";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useFocusEffect: (effect: () => void) => jest.requireActual("react").useEffect(effect),
}));

jest.mock("@/db/logsRepository");

// `HeaderMenu`'s real open/close flow relies on `measureInWindow`, which
// RNTL's host-component mocks never invoke — stub it with a simple always-open
// menu so this test can focus on what LogsScreen wires into it: the items and
// their actions, not HeaderMenu's own popup mechanics.
jest.mock("@/components/HeaderMenu", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    HeaderMenu: ({
      items,
      accessibilityLabel,
    }: {
      items: { key: string; label: string; onPress: () => void }[];
      accessibilityLabel: string;
    }) => (
      <Pressable accessibilityLabel={accessibilityLabel}>
        {items.map((item) => (
          <Pressable key={item.key} onPress={item.onPress} accessibilityRole="menuitem">
            <Text>{item.label}</Text>
          </Pressable>
        ))}
      </Pressable>
    ),
  };
});

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    write: jest.fn(),
    uri: "file://atplace-logs.json",
  })),
  Paths: { cache: "cache" },
}));

const logs: LogEntry[] = [
  { id: "log-1", category: "geofence", message: "Entered Office", createdAt: Date.now() },
];

describe("LogsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRecentLogs as jest.Mock).mockResolvedValue(logs);
    (deleteAllLogs as jest.Mock).mockResolvedValue(undefined);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("does not show standalone Share/Clear buttons", async () => {
    await render(<LogsScreen />);

    expect(screen.queryByText("Share")).toBeNull();
    expect(screen.queryByText("Clear")).toBeNull();
  });

  it("renders a header menu with Share event log and Clear event log", async () => {
    await render(<LogsScreen />);

    expect(screen.getByLabelText("Event log actions")).toBeTruthy();
    expect(screen.getByText("Share event log")).toBeTruthy();
    expect(screen.getByText("Clear event log")).toBeTruthy();
  });

  it("shares the log file when Share event log is pressed", async () => {
    await render(<LogsScreen />);

    fireEvent.press(screen.getByText("Share event log"));

    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalled());
  });

  it("confirms before clearing, and clears on confirm", async () => {
    await render(<LogsScreen />);

    fireEvent.press(screen.getByText("Clear event log"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Clear event log?",
      "This removes all recorded events. This can't be undone.",
      expect.any(Array),
    );

    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    const confirm = buttons.find((button: { text: string }) => button.text === "Clear");
    await confirm.onPress();

    expect(deleteAllLogs).toHaveBeenCalled();
  });
});
