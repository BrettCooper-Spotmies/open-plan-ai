import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { modulesService } from '@/services/modules.service';
import { queryKeys } from '@/lib/queryClient';

/**
 * Fetch a single project with all related data (tasks, milestones, issues).
 * Tasks, milestones, and issues are fetched in parallel and merged into the
 * project object so ProjectDetail can access project.tasks / .milestones / .issues.
 */
export function useProjectDetail(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: async () => {
      const [project, tasks, milestones, issues] = await Promise.all([
        projectsService.getById(projectId!),
        projectsService.getTasks(projectId!).catch(() => []),
        projectsService.getMilestones(projectId!).catch(() => []),
        projectsService.getIssues(projectId!).catch(() => []),
      ]);
      if (!project) return null;
      return {
        ...project,
        tasks: tasks ?? [],
        milestones: milestones ?? [],
        issues: issues ?? [],
      };
    },
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

/**
 * Fetch modules for a specific project
 */
export function useProjectModules(projectId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.modules.list(projectId),
    queryFn: () => modulesService.getByProjectId(projectId!),
    enabled: !!projectId && (options?.enabled ?? true),
  });
}

/**
 * Fetch tasks for a specific project
 */
export function useProjectTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.list(projectId || ''),
    queryFn: () => projectsService.getTasks(projectId!),
    enabled: !!projectId,
  });
}
