import type { PaginatedResponse } from '../dto';

export function toPaginatedResponse<T>(data: {
  items?: T[];
  data?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}): PaginatedResponse<T> {
  const items = data.items ?? data.data ?? [];
  const total = data.total ?? items.length;
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? data.limit ?? items.length;

  return {
    items,
    total,
    page,
    pageSize,
    hasNextPage: page * pageSize < total,
    hasPrevPage: page > 1,
  };
}

export function toISOString(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  return typeof date === 'string' ? date : date.toISOString();
}

export function fromISOString(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function transformKeys<T extends Record<string, unknown>>(
  obj: T,
  transform: (key: string) => string
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [transform(k), v])
  );
}

export function omitNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}
