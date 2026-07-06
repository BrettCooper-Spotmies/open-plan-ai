import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { tasksService } from '@/services/tasks.service';
import { projectsService } from '@/services/projects.service';
import { queryKeys } from '@/lib/queryClient';
import { getDueDateStatus, isCompletedToday, isBlockingOthers, hasUnresolvedDependencies } from '@/features/myday/utils/myDayUtils';
import type { MyDayItem, DueDateStatus } from '@/features/myday/utils/myDayUtils';
import { useProjects } from './useProjects';
import { getUserItems } from '@/features/myday/utils/myDayUtils';
import type { MyDayFilter } from '@/types';

function matchesFilter(status: DueDateStatus, filter: MyDayFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'today') return status === 'today';
  return status === 'overdue';
}

/**
 * Fetch all tasks and issues assigned to the current user across all projects.
 * Tasks come from the dedicated /tasks/me/all endpoint (includes projectName).
 * Issues have no equivalent org-wide "assigned to me" endpoint with assignees
 * populated (the org-wide /organizations/:orgId/issues route is a raw, unjoined
 * select used only by Calendar), so they're fanned out per-project instead —
 * same pattern as issuesService.getOpenCount().
 *
 * `filter` narrows the result to today's items or overdue items; the underlying
 * queries always fetch the full assigned set so switching filters is a client-side
 * recompute, not a refetch.
 */
export function useMyDayTasks(filter: MyDayFilter = 'all') {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { data: projects = [] } = useProjects();

  const { data: rawTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: [...queryKeys.myDay.all, 'tasks', user?.id, orgId],
    queryFn: () => tasksService.getMyTasks(orgId),
    enabled: !!user?.id && !!orgId,
    staleTime: 30 * 1000,
  });

  const projectIds = useMemo(() => projects.map(p => p.id).sort(), [projects]);

  const { data: rawIssues = [], isLoading: issuesLoading } = useQuery({
    queryKey: [...queryKeys.myDay.issues(user?.id || ''), projectIds],
    queryFn: async () => {
      const results = await Promise.all(
        projects.map(async project => {
          const issues = await projectsService.getIssues(project.id).catch(() => []);
          return issues.map(issue => ({ issue, projectName: project.name }));
        })
      );
      return results.flat();
    },
    enabled: !!user?.id && projects.length > 0,
    staleTime: 30 * 1000,
  });

  const data = useMemo((): MyDayItem[] => {
    if (!user?.id) return [];

    // All tasks from /tasks/me/all are already assigned to the current user (filtered server-side)
    const taskItems: MyDayItem[] = rawTasks
      .filter(task => matchesFilter(getDueDateStatus(task.dueDate), filter) && (task.status !== 'done' || isCompletedToday(task)))
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

    // Resolved/wont-fix issues never belong here — only open/in-progress, matching the active filter.
    const issueItems: MyDayItem[] = rawIssues
      .filter(({ issue }) => {
        const isAssignedToUser = issue.assignees?.some(a => a.id === user.id) ?? false;
        const isUnresolved = issue.status !== 'resolved' && issue.status !== 'wont-fix';
        return isUnresolved && isAssignedToUser && matchesFilter(getDueDateStatus(issue.dueDate), filter);
      })
      .map(({ issue, projectName }) => {
        const dueDateStatus = getDueDateStatus(issue.dueDate);
        return {
          id: issue.id,
          itemType: 'issue' as const,
          title: issue.title,
          description: issue.description,
          status: issue.status,
          priority: issue.severity,
          assignees: issue.assignees || [],
          dueDate: issue.dueDate,
          projectId: issue.projectId,
          projectName,
          isOverdue: dueDateStatus === 'overdue',
          isDueToday: dueDateStatus === 'today',
          isBlocked: false,
          originalIssue: issue,
        } as MyDayItem;
      });

    return [...taskItems, ...issueItems];
  }, [user?.id, rawTasks, rawIssues, filter]);

  return { data, isLoading: tasksLoading || issuesLoading };
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
      (item.status === 'done' || item.status === 'resolved') &&
      isCompletedToday(item.originalTask || item.originalIssue)
    ).length;
  }, [user?.id, projects]);

  return { data };
}
