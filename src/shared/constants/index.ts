export { ROUTES } from './routes';
export { QK } from './query-keys';

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const DEBOUNCE_DEFAULT_MS = 300;
export const DEBOUNCE_SEARCH_MS = 400;

export const DATE_FORMATS = {
  display: 'MMM d, yyyy',
  displayWithTime: 'MMM d, yyyy h:mm a',
  input: 'yyyy-MM-dd',
  iso: "yyyy-MM-dd'T'HH:mm:ss'Z'",
} as const;

export const STALE_TIMES = {
  short: 30_000,
  default: 60_000,
  long: 5 * 60_000,
  forever: Infinity,
} as const;
