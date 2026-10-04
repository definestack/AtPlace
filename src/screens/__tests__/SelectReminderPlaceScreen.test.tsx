import { fireEvent, render, screen } from "@testing-library/react-native";

import { SelectReminderPlaceScreen } from "@/screens/SelectReminderPlaceScreen";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockConsumeCreatedPlaceId = jest.fn();
const mockStartAddPlaceForReminder = jest.fn();
let mockCreatedPlaceId: string | null = null;
let mockHeaderProps: { title: string; onBack?: () => void } | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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
    }),
}));

jest.mock("@/store/reminderFlowStore", () => ({
  useReminderFlowStore: (selector: (state: unknown) => unknown) =>
    selector({
      createdPlaceId: mockCreatedPlaceId,
      consumeCreatedPlaceId: mockConsumeCreatedPlaceId,
      startAddPlaceForReminder: mockStartAddPlaceForReminder,
    }),
}));

describe("SelectReminderPlaceScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreatedPlaceId = null;
    mockHeaderProps = undefined;
  });

  it("has no back arrow on the first step, since the tab bar replaces it (issue #103)", async () => {
    await render(<SelectReminderPlaceScreen />);

    expect(mockHeaderProps?.title).toBe("Select Place");
    expect(mockHeaderProps?.onBack).toBeUndefined();
  });

  it("pushes the details step within the Add tab when a place is selected", async () => {
    await render(<SelectReminderPlaceScreen />);

    await fireEvent.press(screen.getByText("Office"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/add/details",
      params: { placeId: "place-1" },
    });
  });

  it("auto-advances to details with a newly created place and consumes the flag", async () => {
    mockCreatedPlaceId = "place-new";

    await render(<SelectReminderPlaceScreen />);

    expect(mockConsumeCreatedPlaceId).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/add/details",
      params: { placeId: "place-new" },
    });
  });
});
