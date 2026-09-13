/**
 * Generates a locally-unique id (timestamp + random suffix, base36). Good
 * enough for a local-first, single-device app — swap for a UUID lib if
 * multi-device sync is ever introduced.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
