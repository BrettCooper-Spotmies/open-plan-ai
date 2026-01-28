import { useQuery } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { modulesService } from '@/services/modules.service';
import { queryKeys } from '@/lib/queryClient';

/**
 * Fetch a single project with all related data (tasks, milestones, issues)
 */
export function useProjectDetail(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: () => projectsService.getById(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Fetch modules for a specific project
 */
export function useProjectModules(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.modules.list(projectId),
    queryFn: () => modulesService.getByProjectId(projectId!),
    enabled: !!projectId,
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
