import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { EditPlaceScreen } from "@/screens/EditPlaceScreen";
import { usePlaceLocationPickStore } from "@/store/placeLocationPickStore";
import type { Place } from "@/types/place";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  // expo-router's useFocusEffect re-runs its callback on every focus; a
  // plain effect is a close enough stand-in under RNTL, where there's no
  // real navigation lifecycle to focus/blur against. `jest.requireActual`
  // (rather than a top-level import) sidesteps Jest's out-of-scope-variable
  // restriction on mock factories.
  useFocusEffect: (effect: () => void) => jest.requireActual("react").useEffect(effect),
}));

const place: Place = {
  id: "place-1",
  name: "Office",
  address: "1 Office Street",
  latitude: 12.9716,
  longitude: 77.5946,
  icon: "briefcase",
  color: "teal",
  radius: 100,
  reminderCount: 2,
};

const mockUpdatePlace = jest.fn();
const mockHydrateReminders = jest.fn();

jest.mock("@/store/placesStore", () => ({
  usePlacesStore: (selector: (state: unknown) => unknown) =>
    selector({ places: [place], updatePlace: mockUpdatePlace }),
}));

jest.mock("@/store/remindersStore", () => ({
  useRemindersStore: (selector: (state: unknown) => unknown) =>
    selector({ hydrate: mockHydrateReminders }),
}));

describe("EditPlaceScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ placeId: "place-1" });
    mockUpdatePlace.mockResolvedValue(undefined);
    mockHydrateReminders.mockResolvedValue(undefined);
    usePlaceLocationPickStore.setState({ picked: null });
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("prefills the form with the saved name and address", async () => {
    await render(<EditPlaceScreen />);

    expect(screen.getByDisplayValue("Office")).toBeTruthy();
    expect(screen.getByDisplayValue("1 Office Street")).toBeTruthy();
  });

  it("shows a fallback message when the place can no longer be found", async () => {
    mockUseLocalSearchParams.mockReturnValue({ placeId: "missing-place" });

    await render(<EditPlaceScreen />);

    expect(screen.getByText("That place could no longer be found.")).toBeTruthy();
    expect(screen.queryByDisplayValue("Office")).toBeNull();
  });

  it("requires a name and does not save when it's blank", async () => {
    await render(<EditPlaceScreen />);

    await fireEvent.changeText(screen.getByDisplayValue("Office"), "");
    await fireEvent.press(screen.getByText("Save"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Name required",
      "Please give this place a name before saving.",
    );
    expect(mockUpdatePlace).not.toHaveBeenCalled();
  });

  it("saves the edited name and address, then goes back", async () => {
    await render(<EditPlaceScreen />);

    await fireEvent.changeText(screen.getByDisplayValue("Office"), "Office HQ");
    await fireEvent.changeText(screen.getByDisplayValue("1 Office Street"), "2 Office Street");
    await fireEvent.press(screen.getByText("Save"));

    expect(mockUpdatePlace).toHaveBeenCalledWith("place-1", {
      name: "Office HQ",
      address: "2 Office Street",
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(mockHydrateReminders).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it("applies a location picked via Change Location, keeping the current name", async () => {
    usePlaceLocationPickStore.setState({
      picked: { latitude: 10, longitude: 20, address: "New Address" },
    });

    await render(<EditPlaceScreen />);

    expect(screen.getByDisplayValue("Office")).toBeTruthy();
    expect(screen.getByDisplayValue("New Address")).toBeTruthy();
    expect(usePlaceLocationPickStore.getState().picked).toBeNull();
  });

  it("shows a friendly error and keeps the place unchanged when saving fails", async () => {
    mockUpdatePlace.mockRejectedValue(new Error("db error"));

    await render(<EditPlaceScreen />);

    await fireEvent.press(screen.getByText("Save"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Couldn't save place",
      "Something went wrong while saving. Please try again.",
    );
    expect(mockHydrateReminders).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
