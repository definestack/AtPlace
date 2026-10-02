import { AppState, type AppStateStatus } from "react-native";

import { logApp } from "@/services/logger";
import { formatIsoTimestamp, formatLogDetail } from "@/utils/logFormat";

/**
 * App lifecycle diagnostics: tells the Event Log whether the app was open,
 * backgrounded, or closed (a headless background run started by Android for
 * a geofence event) around each geofence/notification event, so delivery
 * problems that only happen while the app is closed can be told apart.
 *
 * Android never tells an app it was swiped away or killed, so "closed" can
 * only be inferred: the last "App moved to background" row, followed by a
 * "JS runtime started" row with no UI, means the process was recreated
 * without the user opening the app.
 */

/** Set once the root layout mounts — a headless background run never mounts UI. */
let uiMounted = false;

const runtimeStartedAt = Date.now();

/**
 * Where the app was when this was called, in words for a log row: open
 * (foreground), backgrounded with UI still alive, or a headless background
 * run with no UI (the app was closed when Android woke it).
 */
export function describeAppState(): string {
  const state: AppStateStatus | null = AppState.currentState;
  if (!uiMounted) return "closed (headless background run, no UI)";
  if (state === "active") return "open (foreground)";
  return `in background (${state ?? "unknown"})`;
}

/** Whether the app's UI is in the foreground right now. */
export function isAppInForeground(): boolean {
  return uiMounted && AppState.currentState === "active";
}

/** Logged from `index.js` on every JS launch — UI launches and headless background relaunches alike. */
export function logRuntimeStarted(): void {
  void logApp(
    "JS runtime started",
    formatLogDetail({
      "Started at": formatIsoTimestamp(runtimeStartedAt),
      "AppState at start": AppState.currentState ?? "unknown",
      Note: "If no \"App opened\" row follows, Android started the app in the background (e.g. for a geofence event) while it was closed",
    }),
  );
}

/**
 * Called once from the root layout when the UI mounts: logs the launch and
 * starts logging foreground/background transitions. Returns an unsubscribe
 * function for the effect cleanup.
 */
export function startAppLifecycleLogging(): () => void {
  uiMounted = true;
  void logApp(
    "App opened (UI launched)",
    formatLogDetail({
      AppState: AppState.currentState ?? "unknown",
      "Runtime age": `${Math.round((Date.now() - runtimeStartedAt) / 1000)}s`,
    }),
  );

  let previous: AppStateStatus = AppState.currentState;
  const subscription = AppState.addEventListener("change", (next) => {
    if (next === previous) return;
    const from = previous;
    previous = next;
    if (next === "active") {
      void logApp("App opened (returned to foreground)", formatLogDetail({ From: from }));
    } else if (next === "background") {
      void logApp(
        "App moved to background",
        formatLogDetail({
          From: from,
          Note: "Android may close the app after this without notice; later events then run headless",
        }),
      );
    }
  });
  return () => subscription.remove();
}
