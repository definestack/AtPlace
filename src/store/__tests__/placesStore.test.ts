import { getAllPlaces, updatePlace as updatePlaceRow } from "@/db/placesRepository";
import { usePlacesStore } from "@/store/placesStore";
import type { Place } from "@/types/place";

jest.mock("@/db/placesRepository");

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: "place-1",
    name: "Office",
    address: "1 Office Street",
    latitude: 12.9716,
    longitude: 77.5946,
    icon: "briefcase",
    color: "teal",
    radius: 100,
    reminderCount: 2,
    ...overrides,
  };
}

describe("placesStore.updatePlace", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    usePlacesStore.setState({ places: [], hydrated: false });
  });

  it("persists the change and refreshes places from the repository", async () => {
    const updated = makePlace({ name: "Office HQ" });
    (updatePlaceRow as jest.Mock).mockResolvedValue(undefined);
    (getAllPlaces as jest.Mock).mockResolvedValue([updated]);

    await usePlacesStore.getState().updatePlace("place-1", {
      name: "Office HQ",
      address: "1 Office Street",
      latitude: 12.9716,
      longitude: 77.5946,
    });

    expect(updatePlaceRow).toHaveBeenCalledWith("place-1", {
      name: "Office HQ",
      address: "1 Office Street",
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect(usePlacesStore.getState().places).toEqual([updated]);
  });

  it("rejects and leaves places unchanged when the repository throws", async () => {
    const existing = [makePlace()];
    usePlacesStore.setState({ places: existing, hydrated: true });
    (updatePlaceRow as jest.Mock).mockRejectedValue(new Error("db error"));

    await expect(
      usePlacesStore.getState().updatePlace("place-1", {
        name: "Office HQ",
        address: "1 Office Street",
        latitude: 12.9716,
        longitude: 77.5946,
      }),
    ).rejects.toThrow("db error");

    expect(getAllPlaces).not.toHaveBeenCalled();
    expect(usePlacesStore.getState().places).toBe(existing);
  });
});
