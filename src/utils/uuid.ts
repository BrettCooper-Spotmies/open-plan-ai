/**
 * Strip quotes/whitespace often pasted into IDs by mistake (breaks Postgres uuid cast).
 */
export function sanitizeUuidCandidate(value: string | undefined | null): string {
  if (value == null || typeof value !== 'string') return '';
  return value
    .replace(/['"\u2018\u2019\u201C\u201D\uFEFF]/g, '')
    .trim();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | undefined | null): value is string {
  const s = sanitizeUuidCandidate(value);
  return s.length > 0 && UUID_RE.test(s);
}

/** Returns canonical trimmed UUID or throws a user-facing error. */
export function parseUuidOrThrow(value: string | undefined | null, label: string): string {
  const s = sanitizeUuidCandidate(value);
  if (!UUID_RE.test(s)) {
    throw new Error(`Invalid ${label}. Please refresh the page and try again.`);
  }
  return s;
}
