import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { AddReminderScreen } from "@/screens/AddReminderScreen";

const mockNavigate = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockDismissAll = jest.fn();
const mockAddReminder = jest.fn();
let mockHeaderProps: { title: string; onBack?: () => void } | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    back: mockBack,
    push: mockPush,
    dismissAll: mockDismissAll,
  }),
  useLocalSearchParams: () => ({ placeId: "place-1" }),
  useFocusEffect: (effect: () => void) => jest.requireActual("react").useEffect(effect),
}));

jest.mock("@/components/ScreenHeader", () => ({
  ScreenHeader: (props: { title: string; onBack?: () => void }) => {
    mockHeaderProps = props;
    return null;
  },
}));

jest.mock("@/store/placesStore", () => ({
  usePlacesStore: (selector: (state: unknown) => unknown) =>
    selector({
      places: [{ id: "place-1", name: "Office", address: "1 Main St", icon: "location", color: "teal" }],
      hydrate: jest.fn(),
    }),
}));

jest.mock("@/store/remindersStore", () => ({
  useRemindersStore: (selector: (state: unknown) => unknown) =>
    selector({ addReminder: mockAddReminder }),
}));

jest.mock("@/store/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ reminderTipDismissed: true, setReminderTipDismissed: jest.fn() }),
}));

jest.mock("@/store/reminderDelayPickStore", () => ({
  useReminderDelayPickStore: (selector: (state: unknown) => unknown) =>
    selector({ picked: null, consumePicked: jest.fn() }),
}));

describe("AddReminderScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHeaderProps = undefined;
    mockAddReminder.mockResolvedValue(undefined);
  });

  it("keeps the back arrow on the details step (issue #103)", async () => {
    await render(<AddReminderScreen />);

    expect(mockHeaderProps?.title).toBe("Add Reminder");
    mockHeaderProps?.onBack?.();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("returns to Home after saving, rather than dismissing the Add stack", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    await render(<AddReminderScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText("e.g. Get my laptop"), "Take laptop");
    await fireEvent.press(screen.getByText("Save Reminder"));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const buttons = alertSpy.mock.calls[0][2] ?? [];
    buttons[0]?.onPress?.();

    expect(mockNavigate).toHaveBeenCalledWith("/home");
    expect(mockDismissAll).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
