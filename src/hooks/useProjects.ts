import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { queryKeys } from '@/lib/queryClient';
import { Project } from '@/types';

/**
 * Fetch all projects
 */
export function useProjects() {
  const setProjects = useProjectStore((state) => state.setProjects);

  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const projects = await projectsService.getAll();
      setProjects(projects);
      return projects;
    },
  });
}

/**
 * Fetch single project by ID
 */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: () => projectsService.getById(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Create new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();
  const addProject = useProjectStore((state) => state.addProject);

  return useMutation({
    mutationFn: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => 
      projectsService.create(project),
    onSuccess: (newProject) => {
      addProject(newProject);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/**
 * Update existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const updateProject = useProjectStore((state) => state.updateProject);

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Project> }) =>
      projectsService.update(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.detail(id) });
      
      // Snapshot the previous value
      const previousProject = queryClient.getQueryData(queryKeys.projects.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(queryKeys.projects.detail(id), (old: Project | undefined) => 
        old ? { ...old, ...updates } : old
      );

      return { previousProject };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(queryKeys.projects.detail(id), context.previousProject);
      }
    },
    onSuccess: (updatedProject) => {
      updateProject(updatedProject.id, updatedProject);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(updatedProject.id) });
    },
  });
}

/**
 * Delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();
  const deleteProject = useProjectStore((state) => state.deleteProject);

  return useMutation({
    mutationFn: (projectId: string) => projectsService.delete(projectId),
    onSuccess: (_, projectId) => {
      deleteProject(projectId);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

/**
 * Fetch team members
 */
export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.team.members(),
    queryFn: () => projectsService.getTeamMembers(),
  });
}

/**
 * Fetch modules
 */
export function useModules() {
  return useQuery({
    queryKey: queryKeys.modules.list(),
    queryFn: () => projectsService.getModules(),
  });
}
