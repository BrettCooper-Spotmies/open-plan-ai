import { useQuery } from '@tanstack/react-query';
import { dashboardService, type DashboardStats, type ProjectSummary } from '@/services/dashboard.service';
import { queryKeys } from '@/lib/queryClient';

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: () => dashboardService.getStats(),
  });
}

export function useRecentActivity(limit?: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(limit),
    queryFn: () => dashboardService.getRecentActivity(limit),
  });
}

export function useUpcomingDashboardMilestones(limit?: number) {
  return useQuery({
    queryKey: queryKeys.dashboard.milestones(limit),
    queryFn: () => dashboardService.getUpcomingMilestones(limit),
  });
}

export function useProjectSummaries() {
  return useQuery({
    queryKey: queryKeys.dashboard.projects(),
    queryFn: () => dashboardService.getProjectSummaries(),
  });
}

export type { DashboardStats, ProjectSummary };
