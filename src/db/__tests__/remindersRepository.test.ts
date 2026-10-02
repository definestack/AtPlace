import { getDatabase } from "@/db/database";
import { insertReminder, updateReminder } from "@/db/remindersRepository";
import type { NewReminder, Reminder } from "@/types/reminder";

jest.mock("@/db/database");

function newReminder(overrides: Partial<NewReminder> = {}): NewReminder {
  return {
    id: "reminder-1",
    placeId: "place-1",
    title: "Take laptop",
    trigger: "arrive",
    enabled: true,
    sound: "default",
    vibration: "default",
    repeat: "once",
    delayMinutes: 0,
    ...overrides,
  };
}

function existingReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: "reminder-1",
    placeId: "place-1",
    title: "Take laptop",
    placeName: "Office",
    placeIcon: "briefcase-outline",
    placeColor: "teal",
    trigger: "arrive",
    enabled: true,
    sound: "default",
    vibration: "default",
    repeat: "once",
    delayMinutes: 0,
    ...overrides,
  };
}

describe("insertReminder", () => {
  it("writes delay_minutes alongside the other reminder columns", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });

    await insertReminder(newReminder({ delayMinutes: 5 }));

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = runAsync.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO reminders/i);
    expect(sql).toMatch(/delay_minutes/);
    // id, place_id, title, trigger, enabled, sound, vibration, repeat, delay_minutes, created_at
    expect(params[0]).toBe("reminder-1");
    expect(params[8]).toBe(5);
  });
});

describe("updateReminder", () => {
  it("includes delay_minutes in the UPDATE", async () => {
    const runAsync = jest.fn().mockResolvedValue({ changes: 1 });
    (getDatabase as jest.Mock).mockResolvedValue({ runAsync });

    await updateReminder(existingReminder({ delayMinutes: 10 }));

    expect(runAsync).toHaveBeenCalledTimes(1);
    const [sql, ...params] = runAsync.mock.calls[0];
    expect(sql).toMatch(/UPDATE reminders/i);
    expect(sql).toMatch(/delay_minutes = \?/);
    expect(params).toContain(10);
  });
});
