import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { milestonesService, type Milestone, type MilestoneInsert, type MilestoneUpdate } from '@/services/milestones.service';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: queryKeys.milestones.list(projectId),
    queryFn: () => milestonesService.getByProjectId(projectId),
    enabled: !!projectId,
  });
}

export function useMilestone(milestoneId: string) {
  return useQuery({
    queryKey: queryKeys.milestones.detail(milestoneId),
    queryFn: () => milestonesService.getById(milestoneId),
    enabled: !!milestoneId,
  });
}

export function useUpcomingMilestones(limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.milestones.all, 'upcoming', limit] as const,
    queryFn: () => milestonesService.getUpcoming(limit),
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestone: MilestoneInsert) => milestonesService.create(milestone),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(data.project_id) });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: MilestoneUpdate }) =>
      milestonesService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(data.project_id) });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => milestonesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}

export function useAllMilestones() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: [...queryKeys.milestones.all, 'org', orgId],
    queryFn: async () => {
      const { data: projectRows } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId!)
        .is('deleted_at', null);

      const projectIds = (projectRows || []).map(p => p.id);
      if (!projectIds.length) return [];

      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}

export type { Milestone, MilestoneInsert, MilestoneUpdate };
