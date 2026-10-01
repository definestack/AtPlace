import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "@/screens/HomeScreen";

const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: (effect: () => void) => jest.requireActual("react").useEffect(effect),
}));

jest.mock("@/store/placesStore", () => ({
  usePlacesStore: (selector: (state: unknown) => unknown) =>
    selector({ places: [], hydrated: true, hydrate: jest.fn(), removePlace: jest.fn() }),
}));

jest.mock("@/store/remindersStore", () => ({
  useRemindersStore: (selector: (state: unknown) => unknown) =>
    selector({
      reminders: [],
      hydrated: true,
      hydrate: jest.fn(),
      setEnabled: jest.fn(),
      deleteReminder: jest.fn(),
    }),
}));

jest.mock("@/store/reminderFlowStore", () => ({
  useReminderFlowStore: (selector: (state: unknown) => unknown) =>
    selector({ cancelAddPlaceForReminder: jest.fn() }),
}));

jest.mock("@/store/settingsStore", () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) =>
    selector({ placesTipDismissed: true, setPlacesTipDismissed: jest.fn() }),
}));

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  it("renders the tabs in the order Reminders, then Places", async () => {
    await render(<HomeScreen />);

    const tabLabels = screen
      .getAllByText(/^(Reminders|Places)$/)
      .map((node) => node.props.children);
    expect(tabLabels).toEqual(["Reminders", "Places"]);
  });

  it("defaults to the Reminders tab on a fresh launch", async () => {
    await render(<HomeScreen />);

    expect(screen.getByText("Add a place first")).toBeTruthy();
  });

  it("opens on Places when the tab=places param is given", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tab: "places" });

    await render(<HomeScreen />);

    expect(screen.getByText("Welcome to AtPlace")).toBeTruthy();
  });

  it("opens on Reminders when the tab=reminders param is given", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tab: "reminders" });

    await render(<HomeScreen />);

    expect(screen.getByText("Add a place first")).toBeTruthy();
  });
});
