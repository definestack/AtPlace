import { getDatabase } from "@/db/database";
import { updatePlace } from "@/db/placesRepository";

jest.mock("@/db/database");

describe("updatePlace", () => {
  it("runs a single UPDATE on places by id, touching no other table", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });

    await updatePlace("place-1", {
      name: "Office",
      address: "1 Office Street",
      latitude: 12.9716,
      longitude: 77.5946,
    });

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = runAsync.mock.calls[0];

    // Reminders must stay intact (issue #87): an edit is a plain UPDATE on
    // `places` by id — never a delete-and-recreate or INSERT OR REPLACE,
    // and `reminders` is never referenced.
    expect(sql).toMatch(/^\s*UPDATE places SET/i);
    expect(sql).not.toMatch(/reminders/i);
    expect(sql).not.toMatch(/DELETE|INSERT/i);
    expect(sql).toMatch(/WHERE id = \?/);

    expect(params).toEqual(["Office", "1 Office Street", 12.9716, 77.5946, "place-1"]);
  });

  it("stores a null address when none is given", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });

    await updatePlace("place-1", {
      name: "Office",
      address: undefined,
      latitude: 12.9716,
      longitude: 77.5946,
    });

    const [, ...params] = runAsync.mock.calls[0];
    expect(params).toEqual(["Office", null, 12.9716, 77.5946, "place-1"]);
  });
});
