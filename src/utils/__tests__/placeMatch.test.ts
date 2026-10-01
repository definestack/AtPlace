import type { Place } from "@/types/place";
import { findPlaceAt } from "@/utils/placeMatch";

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: "place-1",
    name: "Office",
    latitude: 0,
    longitude: 0,
    icon: "location",
    color: "teal",
    radius: 100,
    reminderCount: 0,
    ...overrides,
  };
}

describe("findPlaceAt", () => {
  it("returns a place within the tolerance", () => {
    const place = makePlace({ latitude: 12.9716, longitude: 77.5946 });
    // ~5m north of the saved place.
    const coords = { latitude: 12.97165, longitude: 77.5946 };

    expect(findPlaceAt([place], coords)).toBe(place);
  });

  it("ignores a place further away than the tolerance", () => {
    const place = makePlace({ latitude: 12.9716, longitude: 77.5946 });
    // ~1.1km north — well outside the default 25m tolerance.
    const coords = { latitude: 12.9816, longitude: 77.5946 };

    expect(findPlaceAt([place], coords)).toBeUndefined();
  });

  it("returns the nearest match when multiple places are within tolerance", () => {
    const near = makePlace({ id: "near", latitude: 12.97161, longitude: 77.5946 });
    const far = makePlace({ id: "far", latitude: 12.97168, longitude: 77.5946 });
    const coords = { latitude: 12.9716, longitude: 77.5946 };

    expect(findPlaceAt([far, near], coords)).toBe(near);
  });

  it("returns undefined for an empty list", () => {
    expect(findPlaceAt([], { latitude: 0, longitude: 0 })).toBeUndefined();
  });

  it("respects a custom tolerance", () => {
    const place = makePlace({ latitude: 12.9716, longitude: 77.5946 });
    // ~55m away — outside the default tolerance, inside a wider one.
    const coords = { latitude: 12.97209, longitude: 77.5946 };

    expect(findPlaceAt([place], coords)).toBeUndefined();
    expect(findPlaceAt([place], coords, 100)).toBe(place);
  });
});
