import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { queryKeys } from '@/lib/queryClient';
import { Task } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Fetch all tasks across all projects
 */
export function useAllTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: () => tasksService.getAll(),
  });
}

/**
 * Fetch all tasks for the current organization
 */
export function useOrgAllTasks() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: [...queryKeys.tasks.all, 'org', orgId],
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

      // Step 2: Get all tasks for these projects
      const allTasks = await tasksService.getAll();
      return allTasks.filter(t => t.projectId && projectIds.includes(t.projectId));
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch tasks for a specific project
 */
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.list(projectId || ''),
    queryFn: () => tasksService.getAll().then(tasks =>
      tasks.filter(t => {
        // Find which project this task belongs to
        const store = useProjectStore.getState();
        return store.projects.some(p => p.id === projectId && p.tasks.some(pt => pt.id === t.id));
      })
    ),
    enabled: !!projectId,
  });
}

/**
 * Fetch single task by ID
 */
export function useTask(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId || ''),
    queryFn: () => tasksService.getById(taskId!),
    enabled: !!taskId,
  });
}

/**
 * Create new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const addTask = useProjectStore((state) => state.addTask);

  return useMutation({
    mutationFn: ({ projectId, task }: { projectId: string; task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> }) =>
      tasksService.create(projectId, task),
    onSuccess: (newTask, { projectId }) => {
      addTask(projectId, newTask);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

/**
 * Update existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const updateTask = useProjectStore((state) => state.updateTask);

  return useMutation({
    mutationFn: ({ projectId, taskId, updates }: { projectId: string; taskId: string; updates: Partial<Task> }) =>
      tasksService.update(projectId, taskId, updates),
    onMutate: async ({ projectId, taskId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      // Snapshot the previous value
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));

      // Optimistically update the store
      const timestamp = updates.status === 'done' ? new Date().toISOString() : undefined;
      const taskUpdates = { ...updates, updatedAt: timestamp };

      updateTask(projectId, taskId, taskUpdates);

      // Also update the projects cache if it exists
      queryClient.setQueriesData({ queryKey: queryKeys.projects.root }, (old: any) => {
        if (!old) return old;

        // Handle case where old is an array (list of projects)
        if (Array.isArray(old)) {
          return old.map((p: any) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              tasks: (p.tasks || []).map((t: any) =>
                t.id === taskId ? { ...t, ...taskUpdates } : t
              )
            };
          });
        }

        // Handle case where old is a single project object (project detail)
        if (typeof old === 'object' && old.id === projectId) {
          return {
            ...old,
            tasks: (old.tasks || []).map((t: any) =>
              t.id === taskId ? { ...t, ...taskUpdates } : t
            )
          };
        }

        return old;
      });

      return { previousTask, projectId };
    },
    onError: (_err, { projectId, taskId }, context) => {
      // Rollback on error - would need to restore previous task state
      console.error('Task update failed, rolling back', _err);
    },
    onSuccess: (updatedTask, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(updatedTask.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      // Invalidate My Day queries to refresh the My Day page
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

/**
 * Delete task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const deleteTask = useProjectStore((state) => state.deleteTask);

  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) =>
      tasksService.delete(projectId, taskId),
    onSuccess: (_, { projectId, taskId }) => {
      deleteTask(projectId, taskId);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

/**
 * Batch update tasks (e.g., for drag-and-drop)
 */
export function useBatchUpdateTasks() {
  const queryClient = useQueryClient();
  const updateTask = useProjectStore((state) => state.updateTask);

  return useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: Array<{ id: string; updates: Partial<Task> }> }) =>
      tasksService.batchUpdate(projectId, updates),
    onMutate: async ({ projectId, updates }) => {
      // Optimistically update each task
      updates.forEach(({ id, updates: taskUpdates }) => {
        updateTask(projectId, id, taskUpdates);
      });
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}
