import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { tasksService } from '@/services/tasks.service';
import { queryKeys } from '@/lib/queryClient';
import { getDueDateStatus, isCompletedToday, isBlockingOthers, hasUnresolvedDependencies } from '@/features/myday/utils/myDayUtils';
import type { MyDayItem } from '@/features/myday/utils/myDayUtils';
import { useProjects } from './useProjects';
import { getUserItems } from '@/features/myday/utils/myDayUtils';

/**
 * Fetch all tasks assigned to the current user across all projects
 * via the dedicated /tasks/me/all endpoint (includes projectName).
 */
export function useMyDayTasks() {
  const { user } = useAuth();

  const { data: rawTasks = [], isLoading } = useQuery({
    queryKey: [...queryKeys.myDay.all, 'tasks', user?.id],
    queryFn: () => tasksService.getMyTasks(),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const data = useMemo((): MyDayItem[] => {
    if (!user?.id || !rawTasks.length) return [];

    // All tasks from /tasks/me/all are already assigned to the current user (filtered server-side)
    return rawTasks
      .filter(task => task.status !== 'done' || isCompletedToday(task))
      .map(task => {
        const dueDateStatus = getDueDateStatus(task.dueDate);
        return {
          id: task.id,
          itemType: 'task' as const,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assignees: task.assignees || [],
          dueDate: task.dueDate,
          projectId: task.projectId || '',
          projectName: (task as any).projectName || '',
          isOverdue: dueDateStatus === 'overdue',
          isDueToday: dueDateStatus === 'today',
          isBlocked: task.status === 'blocked' || (task.blockedBy?.length ?? 0) > 0,
          isBlockingOthers: isBlockingOthers(task, rawTasks),
          hasUnresolvedDependencies: hasUnresolvedDependencies(task, rawTasks),
          originalTask: task,
        } as MyDayItem;
      });
  }, [user?.id, rawTasks]);

  return { data, isLoading };
}

/**
 * Get count of tasks completed/resolved today
 */
export function useCompletedTodayCount() {
  const { user } = useAuth();
  const { data: projects = [] } = useProjects();

  const data = useMemo(() => {
    if (!user?.id || !projects.length) return 0;
    const allItems = getUserItems(projects, user.id);
    return allItems.filter(item =>
      (item.status === 'done' || item.status === 'resolved' || item.status === 'closed') &&
      isCompletedToday(item.originalTask || item.originalIssue)
    ).length;
  }, [user?.id, projects]);

  return { data };
}
