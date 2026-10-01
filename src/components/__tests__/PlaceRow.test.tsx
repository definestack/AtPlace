import { fireEvent, render, screen } from "@testing-library/react-native";

import { PlaceRow } from "@/components/PlaceRow";
import type { Place } from "@/types/place";

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

describe("PlaceRow", () => {
  it("renders the name, location label and reminder count", async () => {
    await render(<PlaceRow place={place} />);

    expect(screen.getByText("Office")).toBeTruthy();
    expect(screen.getByText("1 Office Street")).toBeTruthy();
    expect(screen.getByText("2 reminders")).toBeTruthy();
  });

  it("shows no Delete action when onDelete is not passed (Select Place)", async () => {
    await render(<PlaceRow place={place} onPress={jest.fn()} />);

    expect(screen.queryByRole("button", { name: "Delete place Office" })).toBeNull();
  });

  it("shows a Delete action when onDelete is passed and calls it on press", async () => {
    const onDelete = jest.fn();
    await render(<PlaceRow place={place} onDelete={onDelete} />);

    const deleteButton = screen.getByRole("button", { name: "Delete place Office" });
    expect(deleteButton).toBeTruthy();

    await fireEvent.press(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(place);
  });

  it("calls onPress with the place when the row is pressed", async () => {
    const onPress = jest.fn();
    await render(<PlaceRow place={place} onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "Office" }));

    expect(onPress).toHaveBeenCalledWith(place);
  });
});
