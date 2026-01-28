import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { projectsService } from '@/services/projects.service';
import { queryKeys } from '@/lib/queryClient';
import { TeamMember } from '@/types';

/**
 * Fetch all team members (profiles) - for assignment dropdowns
 */
export function useTeamMembers() {
  return useQuery({
    queryKey: queryKeys.team.members(),
    queryFn: () => projectsService.getTeamMembers(),
  });
}

/**
 * Fetch organization members with roles
 */
export function useOrganizationMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.members(orgId || ''),
    queryFn: async (): Promise<TeamMember[]> => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, name, email, avatar_url, initials)
        `)
        .eq('organization_id', orgId);

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.profile?.id || m.user_id,
        name: m.profile?.name || 'Unknown',
        email: m.profile?.email || '',
        role: m.role || 'member',
        avatar: m.profile?.avatar_url || undefined,
        initials: m.profile?.initials || 'UN',
      }));
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
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, name, email, avatar_url, initials)
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      return (data || []).map((m: any) => ({
        id: m.profile?.id || m.user_id,
        name: m.profile?.name || 'Unknown',
        email: m.profile?.email || '',
        role: m.role || 'member',
        avatar: m.profile?.avatar_url || undefined,
        initials: m.profile?.initials || 'UN',
      }));
    },
    enabled: !!projectId,
  });
}
