import type { ActiveReminderSummary } from "@/db/remindersRepository";
import type { DelayMinutes, ReminderTrigger } from "@/types/reminder";

/**
 * Pure geofence decision logic, split out from `services/geofencing.ts` so it
 * has no native/AsyncStorage imports and can be unit tested directly. Nothing
 * here touches `TaskManager`, `Location`, or storage — the task handler in
 * `geofencing.ts` is the only thing that calls into Android/AsyncStorage and
 * feeds this module plain data.
 */

/** Backstop for a contradictory transition delivered shortly after registration. */
export const SETTLE_MS = 30_000;

/**
 * Fixed minimum confirmed stay (issue #100) before a Leave reminder is
 * allowed to fire — replaces the old "stay < arrival delay" rule, which
 * depended on a global Arrival Delay that no longer exists. Not
 * user-configurable and independent of any reminder's own delay.
 */
export const MIN_LEAVE_STAY_MS = 60_000;

/**
 * A reminder notification that's been scheduled with a delay (issue: driving
 * through a place shouldn't notify) but hasn't fired/been finalized yet.
 * `notificationIds` are the OS-scheduled notifications to cancel if the
 * transition turns out to be a drive-through; `reminders` is the snapshot
 * needed to write the inbox row(s) and disable one-time reminders once
 * `fireAt` elapses (see `finalizeDuePending`). One entry represents one group
 * of reminders at a place that share both `trigger` and delay (issue #100:
 * different reminders at the same place can have different delays, so a
 * place can have several of these pending at once — see `PendingState`).
 */
export type PendingDelivery = {
  trigger: ReminderTrigger;
  fireAt: number;
  notificationIds: string[];
  reminders: ActiveReminderSummary[];
  /**
   * Resolved sound/vibration per reminder (same order as `reminders`), for
   * delivery diagnostics. Optional: absent in state written by older builds.
   */
  alerts?: AlertPrefsLike[];
};

/** Local alias so this module doesn't need to import `deliveryDiagnostics` just for a type shape. */
type AlertPrefsLike = { sound: boolean; vibration: boolean };

/** Every pending delivery for a place, one entry per distinct delay group still outstanding. */
export type PendingState = Record<string, PendingDelivery[]>;

/**
 * Normalizes pending state read from AsyncStorage: older builds (before
 * issue #100) stored a single `PendingDelivery` object per place, not an
 * array. Wraps that legacy shape in a one-element array; drops anything that
 * isn't recognizable as either shape, so a corrupted/foreign value can never
 * crash the geofence task.
 */
export function normalizePendingState(raw: unknown): PendingState {
  if (!raw || typeof raw !== "object") return {};
  const result: PendingState = {};
  for (const [placeId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      result[placeId] = value.filter(isPendingDelivery);
    } else if (isPendingDelivery(value)) {
      // Legacy single-object-per-place shape.
      result[placeId] = [value];
    }
  }
  return result;
}

function isPendingDelivery(value: unknown): value is PendingDelivery {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PendingDelivery>;
  return (
    (candidate.trigger === "arrive" || candidate.trigger === "leave") &&
    typeof candidate.fireAt === "number" &&
    Array.isArray(candidate.notificationIds) &&
    Array.isArray(candidate.reminders)
  );
}

/** Groups active reminders by their own delay, so each group can be scheduled with its own `fireAt` (issue #100). */
export function groupByDelay(
  reminders: ActiveReminderSummary[],
): Map<DelayMinutes, ActiveReminderSummary[]> {
  const groups = new Map<DelayMinutes, ActiveReminderSummary[]>();
  for (const reminder of reminders) {
    const group = groups.get(reminder.delayMinutes);
    if (group) {
      group.push(reminder);
    } else {
      groups.set(reminder.delayMinutes, [reminder]);
    }
  }
  return groups;
}

/** Why `shouldNotify` suppressed a transition — surfaced in the Event Log (issue #70). */
export type SuppressReason = "alreadyInState" | "settling";

/**
 * Decides whether a geofence event represents a genuine transition (and so
 * should notify), given the last known occupancy for that place. Pure so the
 * decision is easy to reason about independent of AsyncStorage/TaskManager.
 */
export function shouldNotify(
  trigger: ReminderTrigger,
  known: boolean | undefined,
  registeredAt: number,
  now: number,
): { notify: boolean; nextInside: boolean; reason?: SuppressReason } {
  const expectedInside = trigger === "arrive";

  // Already known to be in the state this event claims to move us to — not a
  // real change (this is the immediate post-registration transition, or a
  // duplicate delivery).
  if (known === expectedInside) {
    return { notify: false, nextInside: expectedInside, reason: "alreadyInState" };
  }

  // An apparent transition delivered shortly after (re)registration is still
  // treated as the initial trigger rather than a real move, in case Android
  // delivers it a little late. Occupancy is left as last known (falling back
  // to "not expected" if we never seeded it at all).
  if (now - registeredAt < SETTLE_MS) {
    return { notify: false, nextInside: known ?? !expectedInside, reason: "settling" };
  }

  return { notify: true, nextInside: expectedInside };
}

/** Human-readable text for a `shouldNotify` suppression, shown as the log row's `Reason`. */
export function describeSuppressReason(reason: SuppressReason | undefined): string {
  switch (reason) {
    case "alreadyInState":
      return "Device was already inside/outside this place (duplicate or post-registration event)";
    case "settling":
      return `Within the ${SETTLE_MS / 1000}s settle window after geofences were (re)registered`;
    default:
      return "Unknown";
  }
}

/**
 * What to do about a genuine transition at a place, once `shouldNotify` has
 * confirmed it's real (issue #100: decided per place, across however many
 * distinct pending delay-groups it has):
 *
 * - `cancel` lists every not-yet-fired pending entry of the *opposite*
 *   trigger to drop — see below for why that's always safe to do regardless
 *   of whether this transition goes on to schedule anything.
 * - `schedule` says whether this genuine transition should go on to present
 *   new notifications for the active reminders at this place.
 * - `suppress`, when `schedule` is false and nothing needs cancelling either,
 *   explains why nothing is scheduled.
 */
export type TransitionDecision = {
  cancel: PendingDelivery[];
  schedule: boolean;
  suppress?: "returnedBeforeLeave" | "shortStay";
};

/**
 * Decides how to handle a genuine ENTER/EXIT once `shouldNotify` has ruled
 * out a spurious post-registration event, so a drive-through doesn't notify
 * (the original motivation for this whole delay scheme). Pure, like
 * `shouldNotify`, so the drive-through rules are easy to reason about
 * independent of AsyncStorage/TaskManager.
 *
 * Per-reminder delays (issue #100) mean a place can have several pending
 * delivery groups in flight for the same trigger (e.g. one reminder at 0 min,
 * another at 5 min) — `pendingForPlace` covers all of them.
 *
 * - **ENTER** while any LEAVE group is still pending (not yet fired) means
 *   the device never really left — cancel all of those, nothing new to
 *   schedule. This is a page-level rule, not per-reminder: a genuine ENTER
 *   means the stay was never broken for *any* leave reminder at this place.
 * - **EXIT** cancels every pending ARRIVE group unconditionally (per-reminder
 *   drive-through: each cancelled group never saw its own delay elapse while
 *   the device was actually inside). Separately — **not** gated on whether
 *   anything was cancelled — a genuine EXIT only schedules Leave reminders
 *   when the confirmed stay (`now - enteredAt`) was at least
 *   `MIN_LEAVE_STAY_MS`. `enteredAt` unset (place was already occupied when
 *   regions were last (re)registered) counts as a confirmed stay, matching
 *   today's behavior.
 */
export function planTransition(
  trigger: ReminderTrigger,
  pendingForPlace: PendingDelivery[],
  enteredAt: number | undefined,
  now: number,
): TransitionDecision {
  const pendingOpposite = trigger === "arrive" ? "leave" : "arrive";
  const cancel = pendingForPlace.filter((entry) => entry.trigger === pendingOpposite && entry.fireAt > now);

  if (trigger === "arrive") {
    // A non-empty cancel list here means a leave was still pending — the
    // device never really left, so nothing new is scheduled for this ENTER.
    return cancel.length > 0 ? { cancel, schedule: false, suppress: "returnedBeforeLeave" } : { cancel, schedule: true };
  }

  // EXIT: cancelling pending arrivals and deciding whether to schedule leave
  // reminders are independent (issue #100) — a cancelled arrival no longer
  // implies "no confirmed stay" by itself; only the fixed minimum-stay check
  // does.
  if (enteredAt !== undefined && now - enteredAt < MIN_LEAVE_STAY_MS) {
    return { cancel, schedule: false, suppress: "shortStay" };
  }
  return { cancel, schedule: true };
}
