/**
 * Formatting helpers for Event Log `detail` text (issue #70). Log rows are
 * still a single TEXT column (no schema change) — these helpers give that
 * text a consistent `Label: value` structure that `LogsScreen` can parse back
 * out and render distinctly from free-form text (e.g. a stack trace).
 */

/** A field name/value pair rendered as one `Label: value` line. `undefined`/`null`/`""` values are omitted. */
type LogFields = Record<string, string | number | undefined | null>;

/**
 * Joins non-empty fields into `Label: value` lines, in insertion order.
 * Returns `undefined` when every field was empty, so callers can pass the
 * result straight through as a log's optional `detail`.
 */
export function formatLogDetail(fields: LogFields): string | undefined {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([label, value]) => `${label}: ${value}`);
  return lines.length > 0 ? lines.join("\n") : undefined;
}

/** Appends one formatted block after another, skipping either side when empty. */
export function joinLogDetail(...parts: (string | undefined)[]): string | undefined {
  const nonEmpty = parts.filter((part): part is string => !!part);
  return nonEmpty.length > 0 ? nonEmpty.join("\n") : undefined;
}

const MAX_CAUSE_DEPTH = 5;

/** Renders one Error's own type/message/code — no stack, no cause (used for the top error and each `Caused by`). */
function describeErrorShallow(error: Error): string {
  const name = error.name || error.constructor?.name || "Error";
  const code = (error as { code?: unknown }).code;
  return formatLogDetail({
    Type: name,
    Message: error.message,
    Code: typeof code === "string" || typeof code === "number" ? code : undefined,
  })!;
}

/**
 * Full diagnostic text for an unknown thrown value: type, message, code,
 * the `cause` chain (if any, e.g. from `expo-task-manager`), and finally the
 * stack trace. Used by `logException` so Event Log rows carry everything
 * needed to diagnose a background-only failure without reproducing it.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    let value: string;
    try {
      value = JSON.stringify(error) ?? String(error);
    } catch {
      value = String(error);
    }
    return formatLogDetail({ Type: typeof error, Value: value })!;
  }

  const parts = [describeErrorShallow(error)];

  let cause = (error as { cause?: unknown }).cause;
  let depth = 0;
  while (cause !== undefined && cause !== null && depth < MAX_CAUSE_DEPTH) {
    const causeText = cause instanceof Error ? describeErrorShallow(cause) : `Value: ${String(cause)}`;
    parts.push(`Caused by:\n${causeText}`);
    cause = cause instanceof Error ? (cause as { cause?: unknown }).cause : undefined;
    depth += 1;
  }

  if (error.stack) {
    parts.push(`Stack trace:\n${error.stack}`);
  }

  return parts.join("\n");
}

/** One parsed line of a log's `detail` text — labelled (`Label: value`) or free-form. */
export type LogDetailLine = { label?: string; value: string };

const LABEL_LINE_PATTERN = /^([A-Z][A-Za-z ]{0,30}): (.*)$/;

/**
 * Splits a log's `detail` text back into labelled fields and free-form lines
 * (e.g. stack frames), for `LogsScreen` to render distinctly. Detail text
 * written before issue #70 has no labelled lines and renders unchanged, as
 * plain lines.
 */
export function parseLogDetail(detail: string | undefined): LogDetailLine[] {
  if (!detail) return [];
  return detail.split("\n").map((line) => {
    const match = LABEL_LINE_PATTERN.exec(line);
    return match ? { label: match[1], value: match[2] } : { value: line };
  });
}
