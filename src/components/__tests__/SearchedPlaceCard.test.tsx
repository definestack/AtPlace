import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { SearchedPlaceCard } from "@/components/SearchedPlaceCard";
import type { Place } from "@/types/place";

const savedPlace: Place = {
  id: "place-1",
  name: "Home",
  address: "1 Home Street",
  latitude: 12.9716,
  longitude: 77.5946,
  icon: "home",
  color: "teal",
  radius: 100,
  reminderCount: 0,
};

// SearchedPlaceCard reads safe-area insets, which only resolve under a
// SafeAreaProvider — `initialWindowMetrics` is undefined in the test
// environment, so we supply fixed metrics instead. `render` is async in
// @testing-library/react-native v14, so every caller must await it.
async function renderCard(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={
        initialWindowMetrics ?? {
          frame: { x: 0, y: 0, width: 320, height: 640 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }
      }
    >
      {ui}
    </SafeAreaProvider>,
  );
}

describe("SearchedPlaceCard", () => {
  it("renders the searched name, address and a Save place action", async () => {
    await renderCard(
      <SearchedPlaceCard
        name="Coffee Shop"
        address="42 Main St"
        onSave={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText("Coffee Shop")).toBeTruthy();
    expect(screen.getByText("42 Main St")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Coffee Shop as a place" })).toBeTruthy();
  });

  it("calls onSave when Save place is pressed", async () => {
    const onSave = jest.fn();
    await renderCard(
      <SearchedPlaceCard name="Coffee Shop" address="42 Main St" onSave={onSave} onDismiss={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Save Coffee Shop as a place" }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when the close button is pressed", async () => {
    const onDismiss = jest.fn();
    await renderCard(
      <SearchedPlaceCard name="Coffee Shop" address="42 Main St" onSave={jest.fn()} onDismiss={onDismiss} />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Dismiss search result" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("shows an already-saved notice and no Save action when savedPlace is set", async () => {
    await renderCard(
      <SearchedPlaceCard
        name="Coffee Shop"
        address="42 Main St"
        savedPlace={savedPlace}
        onSave={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByText("Already saved as Home")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Save .* as a place/ })).toBeNull();
  });
});
