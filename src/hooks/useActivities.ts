import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesService, type Activity, type ActivityInsert } from '@/services/activities.service';
import { queryKeys } from '@/lib/queryClient';

export function useRecentActivities(limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.activities.all, 'recent', limit] as const,
    queryFn: () => activitiesService.getRecent(limit),
  });
}

export function useProjectActivities(projectId: string) {
  return useQuery({
    queryKey: queryKeys.activities.byProject(projectId),
    queryFn: () => activitiesService.getByProjectId(projectId),
    enabled: !!projectId,
  });
}

export function useEntityActivities(entityId: string, entityType: string) {
  return useQuery({
    queryKey: [...queryKeys.activities.all, 'entity', entityId, entityType] as const,
    queryFn: () => activitiesService.getByEntityId(entityId, entityType),
    enabled: !!entityId && !!entityType,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activity: ActivityInsert) => activitiesService.create(activity),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      if (data.project_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.activities.byProject(data.project_id) });
      }
    },
  });
}

export type { Activity, ActivityInsert };
