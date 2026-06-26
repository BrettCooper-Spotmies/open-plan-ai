import { useQueries } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { bomService } from '@/services/bom.service';
import { queryKeys } from '@/lib/queryClient';
import type { ApiEcoStats, ApiEcoListItem } from '@/hooks/useECOs';

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ── ECO aggregate across all org projects ──────────────────────────────────────

export interface OrgEcoAggregate {
  isLoading: boolean;
  open: number;
  awaitingMyAction: number;
  firstPassPct: number | null; // null when there's no ECO history to compute from
  avgCycleDays: number | null;
}

function fetchEcoStats(projectId: string): Promise<ApiEcoStats> {
  return apiClient.get<ApiEcoStats>(ENDPOINTS.ECOS.STATS(projectId));
}

function fetchEcoList(projectId: string): Promise<PaginatedResponse<ApiEcoListItem>> {
  return apiClient.raw
    .get(ENDPOINTS.ECOS.LIST(projectId), { params: { limit: 100 } })
    .then((r) => ({ data: r.data.data, meta: r.data.meta }));
}

export function useOrgEcoAggregate(projectIds: string[]): OrgEcoAggregate {
  const statsQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: queryKeys.ecos.stats(id),
      queryFn: () => fetchEcoStats(id),
    })),
  });

  const listQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: queryKeys.ecos.list(id, { limit: 100 }),
      queryFn: () => fetchEcoList(id),
    })),
  });

  const isLoading = statsQueries.some((q) => q.isLoading) || listQueries.some((q) => q.isLoading);

  const open = statsQueries.reduce((sum, q) => sum + (q.data?.openEcos ?? 0), 0);
  const awaitingMyAction = statsQueries.reduce((sum, q) => sum + (q.data?.awaitingMyAction ?? 0), 0);

  const allEcos = listQueries.flatMap((q) => q.data?.data ?? []);
  const total = allEcos.length;
  const reworked = allEcos.filter((e) => e.status === 'rework').length;
  const firstPassPct = total > 0 ? Math.round(((total - reworked) / total) * 100) : null;

  const cycleDays = allEcos
    .map((e) => {
      if (!e.targetDate) return null;
      const created = new Date(e.initiatedAt).getTime();
      const target = new Date(e.targetDate).getTime();
      return (target - created) / 86400000;
    })
    .filter((d): d is number => d != null && !Number.isNaN(d));
  const avgCycleDays = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((s, d) => s + d, 0) / cycleDays.length)
    : null;

  return { isLoading, open, awaitingMyAction, firstPassPct, avgCycleDays };
}

// ── ECO pipeline-by-stage counts across all org projects ───────────────────────

export function useOrgEcoStatusCounts(projectIds: string[]) {
  const listQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: queryKeys.ecos.list(id, { limit: 100 }),
      queryFn: () => fetchEcoList(id),
    })),
  });

  const isLoading = listQueries.some((q) => q.isLoading);
  const allEcos = listQueries.flatMap((q) => q.data?.data ?? []);
  return { isLoading, ecos: allEcos };
}

// ── BOM aggregate across all org projects ──────────────────────────────────────

export interface OrgBomAggregate {
  isLoading: boolean;
  total: number;
  approved: number;
  pending: number;
  pct: number; // approved / total, 0 when total is 0
}

export function useOrgBomAggregate(projectIds: string[]): OrgBomAggregate {
  const summaryQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: queryKeys.bom.summary(id),
      queryFn: () => bomService.getSummary(id),
    })),
  });

  const isLoading = summaryQueries.some((q) => q.isLoading);
  const total = summaryQueries.reduce((sum, q) => sum + (q.data?.totalNodes ?? 0), 0);
  const approved = summaryQueries.reduce((sum, q) => sum + (q.data?.approvedCount ?? 0), 0);
  const pending = summaryQueries.reduce((sum, q) => sum + (q.data?.pendingCount ?? 0), 0);
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  return { isLoading, total, approved, pending, pct };
}
