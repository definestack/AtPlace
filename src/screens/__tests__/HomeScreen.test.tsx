import { fireEvent, render, screen } from "@testing-library/react-native";

import { HomeScreen } from "@/screens/HomeScreen";

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockUseLocalSearchParams = jest.fn();
let mockPlaces: unknown[] = [];

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate, setParams: mockSetParams }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: (effect: () => void) => jest.requireActual("react").useEffect(effect),
}));

jest.mock("@/store/placesStore", () => ({
  usePlacesStore: (selector: (state: unknown) => unknown) =>
    selector({ places: mockPlaces, hydrated: true, hydrate: jest.fn(), removePlace: jest.fn() }),
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
    mockPlaces = [];
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

  it("switches to the Add tab from the Create Reminder CTA (issue #103)", async () => {
    mockPlaces = [{ id: "place-1", name: "Office" }];

    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText("+ Create Reminder"));

    expect(mockNavigate).toHaveBeenCalledWith("/add");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
