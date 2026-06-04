import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksService } from '@/services/tasks.service';
import { issuesService } from '@/services/issues.service';
import { milestonesService, type MilestoneInsert, type MilestoneUpdate } from '@/services/milestones.service';
import { modulesService, type ModuleInsert, type ModuleUpdate } from '@/services/modules.service';
import { queryKeys } from '@/lib/queryClient';
import { Task, Issue, Milestone } from '@/types';
import { toast } from 'sonner';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/services/monitoring/logger';

// ==================== Task Mutations ====================

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  const { createNotification } = useNotifications();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) =>
      tasksService.create(projectId, task),
    onSuccess: (newTask, variables) => {
      variables.assignees?.forEach((assignee) => {
        if (assignee.id !== user?.id) {
          createNotification.mutate({
            user_id: assignee.id,
            actor_id: user?.id,
            type: 'assignment',
            title: 'New task assigned',
            description: `You have been assigned to "${variables.title}"`,
            project_id: projectId,
            entity_id: newTask.id,
            entity_type: 'task',
          }, {
            onError: (err) => logger.error('Failed to send task-assignment notification:', err),
          });
        }
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      logger.error('Error creating task:', error);
      toast.error('Failed to create task');
    },
  });
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient();
  const { createNotification } = useNotifications();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      tasksService.update(projectId, taskId, updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));
      const previousTask = (previousProject as any)?.tasks?.find((t: Task) => t.id === taskId) as Task | undefined;

      // Optimistic update
      queryClient.setQueryData(queryKeys.projects.detail(projectId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t: Task) =>
            t.id === taskId ? {
              ...t,
              ...updates,
              updatedAt: updates.status === 'done' ? new Date().toISOString() : t.updatedAt
            } : t
          ),
        };
      });

      return { previousProject, previousTask };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousProject);
      }
      toast.error('Failed to update task');
    },
    onSuccess: (updatedTask, variables, context) => {
      // Find newly added assignees
      if (variables.updates.assignees) {
        const previousTask = context?.previousTask;

        const previousAssigneeIds = new Set(previousTask?.assignees?.map((a: any) => a.id) || []);

        variables.updates.assignees.forEach((assignee: any) => {
          if (assignee.id !== user?.id && !previousAssigneeIds.has(assignee.id)) {
            createNotification.mutate({
              user_id: assignee.id,
              actor_id: user?.id,
              type: 'assignment',
              title: 'New task assigned',
              description: `You have been assigned to "${updatedTask.title || variables.updates.title || previousTask?.title}"`,
              project_id: projectId,
              entity_id: variables.taskId,
              entity_type: 'task',
            }, {
              onError: (err) => logger.error('Failed to send task-update notification:', err),
            });
          }
        });
      }

      // Notify on completion
      const wasDone = context?.previousTask?.status === 'done';
      const isNowDone = updatedTask.status === 'done';
      if (!wasDone && isNowDone) {
        const task = updatedTask;

        if (task) {
          task.assignees?.forEach((assignee: any) => {
            if (assignee.id && assignee.id !== user?.id) {
              createNotification.mutate({
                user_id: assignee.id,
                actor_id: user?.id || undefined,
                type: 'completed',
                title: 'Task completed',
                description: `Task "${task.title}" has been marked as completed`,
                project_id: projectId || undefined,
                entity_id: variables.taskId || undefined,
                entity_type: 'task',
              }, {
                onError: (err) => logger.error('Failed to send task-completed notification:', err),
              });
            }
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksService.delete(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
      toast.success('Task deleted');
    },
    onError: () => {
      toast.error('Failed to delete task');
    },
  });
}

export function useBatchUpdateTasks(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; updates: Partial<Task> }>) =>
      tasksService.batchUpdate(projectId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
    onError: () => {
      toast.error('Failed to update tasks');
    },
  });
}

// ==================== Issue Mutations ====================

export function useCreateIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issue: Omit<Issue, 'id' | 'reportedAt'>) =>
      issuesService.create(projectId, issue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
      toast.success('Issue created successfully');
    },
    onError: (error) => {
      logger.error('Error creating issue:', error);
      toast.error('Failed to create issue');
    },
  });
}

export function useUpdateIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, updates }: { issueId: string; updates: Partial<Issue> }) =>
      issuesService.update(issueId, updates),
    onMutate: async ({ issueId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));

      queryClient.setQueryData(queryKeys.projects.detail(projectId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          issues: old.issues?.map((i: Issue) =>
            i.id === issueId ? { ...i, ...updates } : i
          ) || [],
        };
      });

      return { previousProject };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousProject);
      }
      toast.error('Failed to update issue');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
    },
  });
}

export function useDeleteIssue(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => issuesService.delete(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDay.all });
      toast.success('Issue deleted');
    },
    onError: () => {
      toast.error('Failed to delete issue');
    },
  });
}

// ==================== Milestone Mutations ====================

export function useCreateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestone: Omit<MilestoneInsert, 'project_id'>) =>
      milestonesService.create({ ...milestone, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Milestone created successfully');
    },
    onError: (error) => {
      logger.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
    },
  });
}

export function useUpdateMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ milestoneId, updates }: { milestoneId: string; updates: MilestoneUpdate }) =>
      milestonesService.update(milestoneId, updates),
    onMutate: async ({ milestoneId, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(projectId) });
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(projectId));

      queryClient.setQueryData(queryKeys.projects.detail(projectId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          milestones: old.milestones?.map((m: Milestone) =>
            m.id === milestoneId ? { ...m, ...updates } : m
          ) || [],
        };
      });

      return { previousProject };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(projectId), context.previousProject);
      }
      toast.error('Failed to update milestone');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteMilestone(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (milestoneId: string) => milestonesService.delete(milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.milestones.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Milestone deleted');
    },
    onError: () => {
      toast.error('Failed to delete milestone');
    },
  });
}

// ==================== Module Mutations ====================

export function useCreateModule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (module: Omit<ModuleInsert, 'project_id'>) =>
      modulesService.create({ ...module, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.list(projectId) });
      toast.success('Module created successfully');
    },
    onError: (error) => {
      logger.error('Error creating module:', error);
      toast.error('Failed to create module');
    },
  });
}

export function useUpdateModule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, updates }: { moduleId: string; updates: ModuleUpdate }) =>
      modulesService.update(moduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Module updated successfully');
    },
    onError: () => {
      toast.error('Failed to update module');
    },
  });
}

export function useDeleteModule(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (moduleId: string) => modulesService.delete(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.list(projectId) });
      toast.success('Module deleted');
    },
    onError: () => {
      toast.error('Failed to delete module');
    },
  });
}

export function useBatchUpdateModules(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; name?: string; milestone_id?: string | null }>) =>
      modulesService.updateMany(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.modules.list(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
    onError: () => {
      toast.error('Failed to update modules');
    },
  });
}
