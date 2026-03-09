import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issuesService } from '@/services/issues.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { queryKeys } from '@/lib/queryClient';
import { Issue } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Fetch all issues across all projects
 */
export function useAllIssues() {
  return useQuery({
    queryKey: queryKeys.issues.all,
    queryFn: () => issuesService.getAll(),
  });
}

/**
 * Fetch all issues for the current organization
 */
export function useOrgAllIssues() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: [...queryKeys.issues.all, 'org', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      // Step 1: Get all project IDs for this organization
      const { data: projectRows } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId)
        .is('deleted_at', null);

      const projectIds = (projectRows || []).map(p => p.id);
      if (projectIds.length === 0) return [];

      // Step 2: Get all issues for these projects
      const allIssues = await issuesService.getAll();
      return allIssues.filter(i => i.projectId && projectIds.includes(i.projectId));
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch issues for a specific project
 */
export function useProjectIssues(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.issues.list(projectId),
    queryFn: () => issuesService.getAll().then(issues =>
      issues.filter(i => i.projectId === projectId)
    ),
    enabled: !!projectId,
  });
}

/**
 * Fetch single issue by ID
 */
export function useIssue(issueId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.issues.detail(issueId || ''),
    queryFn: () => issuesService.getById(issueId!),
    enabled: !!issueId,
  });
}

/**
 * Fetch open issues count
 */
export function useOpenIssuesCount() {
  return useQuery({
    queryKey: queryKeys.issues.openCount(),
    queryFn: () => issuesService.getOpenCount(),
  });
}

/**
 * Create new issue
 */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  const addIssue = useProjectStore((state) => state.addIssue);

  return useMutation({
    mutationFn: ({ projectId, issue }: { projectId: string; issue: Omit<Issue, 'id' | 'reportedAt'> }) =>
      issuesService.create(projectId, issue),
    onSuccess: (newIssue, { projectId }) => {
      addIssue(projectId, newIssue);
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.openCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

/**
 * Update existing issue
 */
export function useUpdateIssue() {
  const queryClient = useQueryClient();
  const updateIssue = useProjectStore((state) => state.updateIssue);

  return useMutation({
    mutationFn: ({ projectId, issueId, updates }: { projectId: string; issueId: string; updates: Partial<Issue> }) =>
      issuesService.update(issueId, updates),
    onMutate: async ({ projectId, issueId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.issues.detail(issueId) });

      // Snapshot the previous value
      const previousIssue = queryClient.getQueryData(queryKeys.issues.detail(issueId));

      // Optimically update the store
      const timestamp = (updates.status === 'resolved' || updates.status === 'closed') ? new Date().toISOString() : undefined;
      const issueUpdates = { ...updates, resolvedAt: timestamp };
      updateIssue(projectId, issueId, issueUpdates);

      // Also update the projects cache if it exists
      queryClient.setQueriesData({ queryKey: queryKeys.projects.root }, (old: any) => {
        if (!old) return old;
        return old.map((p: any) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            issues: (p.issues || []).map((i: any) =>
              i.id === issueId ? { ...i, ...issueUpdates } : i
            )
          };
        });
      });

      return { previousIssue, projectId };
    },
    onError: (_err, { projectId, issueId }, context) => {
      console.error('Issue update failed, rolling back', _err);
    },
    onSuccess: (updatedIssue, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.detail(updatedIssue.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.openCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

/**
 * Delete issue
 */
export function useDeleteIssue() {
  const queryClient = useQueryClient();
  const deleteIssue = useProjectStore((state) => state.deleteIssue);

  return useMutation({
    mutationFn: ({ projectId, issueId }: { projectId: string; issueId: string }) =>
      issuesService.delete(issueId),
    onSuccess: (_, { projectId, issueId }) => {
      deleteIssue(projectId, issueId);
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.removeQueries({ queryKey: queryKeys.issues.detail(issueId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.openCount() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}
