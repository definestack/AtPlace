/** What kind of event a log row records — see `services/logger.ts`. */
export type LogCategory = "geofence" | "notification" | "vibration" | "app" | "exception" | "info";

/**
 * A single diagnostic event (issue #37, extended in #70): geofence
 * transitions, notification deliveries/suppressions, vibration requests, and
 * exceptions, captured so background-only failures (app closed) can be
 * inspected from Settings > Event Log.
 */
export type LogEntry = {
  id: string;
  category: LogCategory;
  message: string;
  detail?: string;
  createdAt: number;
};

/** Input for creating a new log row — `id`/`createdAt` are assigned on insert. */
export type NewLog = {
  category: LogCategory;
  message: string;
  detail?: string;
};
