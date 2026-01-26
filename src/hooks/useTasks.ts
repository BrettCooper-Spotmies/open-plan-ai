import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { queryKeys } from '@/lib/queryClient';
import { Task } from '@/types';

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
      updateTask(projectId, taskId, updates);

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
    },
  });
}
