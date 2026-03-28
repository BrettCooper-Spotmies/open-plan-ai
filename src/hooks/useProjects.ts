import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '@/services/projects.service';
import { useProjectStore } from '@/stores/useProjectStore';
import { useOrganization } from '@/contexts/OrganizationContext';
import { queryKeys } from '@/lib/queryClient';
import { Project } from '@/types';

/**
 * Fetch all projects scoped to the current organization
 */
/** Shorter stale window so project access changes (membership) show up without waiting on realtime alone. */
const PROJECTS_LIST_STALE_MS = 45 * 1000;

export function useProjects() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: queryKeys.projects.all(orgId),
    queryFn: async () => {
      const projects = await projectsService.getAll(orgId);
      useProjectStore.getState().setProjects(projects);
      return projects;
    },
    enabled: !!orgId,
    staleTime: PROJECTS_LIST_STALE_MS,
    gcTime: 15 * 60 * 1000,
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
    mutationFn: ({ project, organizationId }: {
      project: Parameters<typeof projectsService.create>[0];
      organizationId: string;
    }) => projectsService.create(project, organizationId),
    onSuccess: (newProject) => {
      addProject(newProject);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.root });
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
