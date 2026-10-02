import type { ActiveReminderSummary } from "@/db/remindersRepository";
import {
  describeSuppressReason,
  groupByDelay,
  MIN_LEAVE_STAY_MS,
  normalizePendingState,
  planTransition,
  SETTLE_MS,
  shouldNotify,
  type PendingDelivery,
} from "@/services/geofencePlanning";

function makeReminder(overrides: Partial<ActiveReminderSummary> = {}): ActiveReminderSummary {
  return {
    reminderId: "reminder-1",
    title: "Take laptop",
    placeName: "Office",
    placeIcon: "briefcase-outline",
    placeColor: "teal",
    sound: "default",
    vibration: "default",
    repeat: "once",
    delayMinutes: 0,
    ...overrides,
  };
}

function makePending(overrides: Partial<PendingDelivery> = {}): PendingDelivery {
  return {
    trigger: "arrive",
    fireAt: Date.now() + 60_000,
    notificationIds: ["n1"],
    reminders: [makeReminder()],
    ...overrides,
  };
}

describe("shouldNotify", () => {
  const now = 1_700_000_000_000;

  it("suppresses an event that matches the already-known occupancy", () => {
    const result = shouldNotify("arrive", true, now - SETTLE_MS - 1, now);
    expect(result).toEqual({ notify: false, nextInside: true, reason: "alreadyInState" });
  });

  it("suppresses a genuine-looking transition within the settle window", () => {
    const result = shouldNotify("arrive", false, now - 1_000, now);
    expect(result).toEqual({ notify: false, nextInside: false, reason: "settling" });
  });

  it("notifies for a genuine transition outside the settle window", () => {
    const result = shouldNotify("arrive", false, now - SETTLE_MS - 1, now);
    expect(result).toEqual({ notify: true, nextInside: true });
  });

  it("notifies for a genuine EXIT outside the settle window", () => {
    const result = shouldNotify("leave", true, now - SETTLE_MS - 1, now);
    expect(result).toEqual({ notify: true, nextInside: false });
  });
});

describe("describeSuppressReason", () => {
  it("describes each known reason and falls back for an unknown one", () => {
    expect(describeSuppressReason("alreadyInState")).toMatch(/already inside\/outside/);
    expect(describeSuppressReason("settling")).toMatch(/settle window/);
    expect(describeSuppressReason(undefined)).toBe("Unknown");
  });
});

describe("normalizePendingState", () => {
  it("passes through the current array-per-place shape", () => {
    const entry = makePending();
    const state = normalizePendingState({ "place-1": [entry] });
    expect(state).toEqual({ "place-1": [entry] });
  });

  it("wraps the legacy single-object-per-place shape in an array", () => {
    const entry = makePending();
    const state = normalizePendingState({ "place-1": entry });
    expect(state).toEqual({ "place-1": [entry] });
  });

  it("drops a place whose value isn't recognizable as either shape", () => {
    const state = normalizePendingState({ "place-1": { garbage: true }, "place-2": "nope" });
    expect(state).toEqual({});
  });

  it("filters out unrecognizable entries within an array", () => {
    const entry = makePending();
    const state = normalizePendingState({ "place-1": [entry, { garbage: true }] });
    expect(state).toEqual({ "place-1": [entry] });
  });

  it("returns {} for null/non-object input", () => {
    expect(normalizePendingState(null)).toEqual({});
    expect(normalizePendingState(undefined)).toEqual({});
    expect(normalizePendingState("garbage")).toEqual({});
  });
});

describe("groupByDelay", () => {
  it("groups reminders by their own delay", () => {
    const immediate = makeReminder({ reminderId: "r1", delayMinutes: 0 });
    const fiveMin = makeReminder({ reminderId: "r2", delayMinutes: 5 });
    const anotherImmediate = makeReminder({ reminderId: "r3", delayMinutes: 0 });

    const groups = groupByDelay([immediate, fiveMin, anotherImmediate]);

    expect(groups.get(0)).toEqual([immediate, anotherImmediate]);
    expect(groups.get(5)).toEqual([fiveMin]);
    expect(groups.size).toBe(2);
  });

  it("returns an empty map for no reminders", () => {
    expect(groupByDelay([]).size).toBe(0);
  });
});

describe("planTransition", () => {
  const now = 1_700_000_000_000;

  it("ENTER cancels every unfired pending leave group and schedules nothing new", () => {
    const stillPending = makePending({ trigger: "leave", fireAt: now + 1_000 });
    const alreadyFired = makePending({ trigger: "leave", fireAt: now - 1_000 });
    const unrelatedArrive = makePending({ trigger: "arrive", fireAt: now + 1_000 });

    const decision = planTransition("arrive", [stillPending, alreadyFired, unrelatedArrive], undefined, now);

    expect(decision.cancel).toEqual([stillPending]);
    expect(decision.schedule).toBe(false);
    expect(decision.suppress).toBe("returnedBeforeLeave");
  });

  it("ENTER schedules normally when no leave is pending", () => {
    const decision = planTransition("arrive", [], undefined, now);
    expect(decision).toEqual({ cancel: [], schedule: true });
  });

  it("EXIT cancels every unfired pending arrive group (per-reminder drive-through)", () => {
    const pendingArrive = makePending({ trigger: "arrive", fireAt: now + 1_000 });
    const decision = planTransition("leave", [pendingArrive], now - MIN_LEAVE_STAY_MS - 1, now);

    expect(decision.cancel).toEqual([pendingArrive]);
    // Cancelling the arrival doesn't by itself suppress leave — only the
    // fixed minimum-stay check does (issue #100's decoupling).
    expect(decision.schedule).toBe(true);
  });

  it("EXIT still schedules leave reminders even with no pending arrival to cancel, given a long enough stay", () => {
    const decision = planTransition("leave", [], now - MIN_LEAVE_STAY_MS, now);
    expect(decision).toEqual({ cancel: [], schedule: true });
  });

  it("suppresses leave at 59s stayed (just under the 60s minimum)", () => {
    const enteredAt = now - 59_000;
    const decision = planTransition("leave", [], enteredAt, now);
    expect(decision.schedule).toBe(false);
    expect(decision.suppress).toBe("shortStay");
  });

  it("fires leave at exactly 60s stayed (the minimum)", () => {
    const enteredAt = now - MIN_LEAVE_STAY_MS;
    const decision = planTransition("leave", [], enteredAt, now);
    expect(decision.schedule).toBe(true);
    expect(decision.suppress).toBeUndefined();
  });

  it("treats an unset enteredAt as a confirmed stay", () => {
    const decision = planTransition("leave", [], undefined, now);
    expect(decision.schedule).toBe(true);
  });
});
