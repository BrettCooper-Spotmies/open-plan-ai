import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { queryKeys } from '@/lib/queryClient';
import { TeamMember } from '@/types';

const isValidUuid = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ||
    /^[0-9a-f]{32}$/i.test(value)
  );
};

/**
 * Fetch all team members (profiles) - for assignment dropdowns
 * Uses org members since there's no global users endpoint.
 */
export function useTeamMembers(orgId?: string) {
  return useOrganizationMembers(orgId);
}

/**
 * Fetch organization members with roles
 */
export function useOrganizationMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.members(orgId || ''),
    queryFn: async (): Promise<TeamMember[]> => {
      if (!orgId) return [];

      const data = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId));
      const members = data || [];

      return members
        .map((m) => {
          const profileId = (m.userId ?? m.user_id ?? m.id) as string | undefined;
          if (!profileId || !isValidUuid(profileId)) return null;

          const name = (m.name ?? '') as string;
          if (!name.trim()) return null;

          return {
            id: profileId,
            name,
            email: (m.email ?? '') as string,
            role: (m.role ?? 'member') as string,
            avatar: (m.avatarUrl ?? m.avatar_url ?? undefined) as string | undefined,
            initials: ((m.initials ?? name.slice(0, 2).toUpperCase()) as string),
          } satisfies TeamMember;
        })
        .filter((member): member is TeamMember => member !== null);
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch project members specifically
 */
export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!projectId) return [];

      const data = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.PROJECTS.MEMBERS(projectId));
      const members = data || [];

      const seen = new Set<string>();
      return members
        .map((m) => {
          const profileId = (m.userId ?? m.user_id ?? m.id) as string | undefined;
          if (!profileId || !isValidUuid(profileId)) return null;

          const name = (m.name ?? '') as string;
          if (!name.trim()) return null;

          if (seen.has(profileId)) return null;
          seen.add(profileId);

          return {
            id: profileId,
            name,
            email: (m.email ?? '') as string,
            role: (m.role ?? 'member') as string,
            avatar: (m.avatarUrl ?? m.avatar_url ?? undefined) as string | undefined,
            initials: ((m.initials ?? name.slice(0, 2).toUpperCase()) as string),
          } satisfies TeamMember;
        })
        .filter((member): member is TeamMember => member !== null);
    },
    enabled: !!projectId,
  });
}
