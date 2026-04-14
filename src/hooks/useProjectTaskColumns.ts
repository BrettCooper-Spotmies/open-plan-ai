import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { projectTaskColumnsService, type ProjectTaskColumn } from '@/services/projectTaskColumns.service';

const projectTaskColumnsKey = (projectId: string) => ['project-task-columns', projectId] as const;

export function useProjectTaskColumns(projectId?: string) {
  return useQuery({
    queryKey: projectId ? projectTaskColumnsKey(projectId) : ['project-task-columns', 'none'],
    queryFn: () => projectTaskColumnsService.getByProjectId(projectId!),
    enabled: !!projectId,
  });
}

export function useSaveProjectTaskColumns(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columns: ProjectTaskColumn[]) => {
      if (!projectId) return Promise.resolve([]);
      return projectTaskColumnsService.replaceForProject(projectId, columns);
    },
    onSuccess: (savedColumns) => {
      if (!projectId) return;
      queryClient.setQueryData(projectTaskColumnsKey(projectId), savedColumns);
    },
    onError: () => {
      toast.error('Failed to save board buckets');
    },
  });
}
