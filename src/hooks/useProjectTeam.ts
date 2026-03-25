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
      
      // Fetch members first
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId);

      if (membersError) throw membersError;
      if (!members?.length) return [];

      // Deduplicate to avoid repeated users in assignment dropdowns.
      const seenUserIds = new Set<string>();
      const uniqueMembers = members.filter((m) => {
        if (seenUserIds.has(m.user_id)) return false;
        seenUserIds.add(m.user_id);
        return true;
      });
      const userIds = uniqueMembers.map(m => m.user_id);

      // Fetch profiles separately to avoid ambiguous FK join
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials, deleted_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const validProfiles = (profiles || []).filter((p) =>
        !p.deleted_at &&
        !!p.id &&
        !!p.name &&
        !!String(p.name).trim()
      );
      const profileMap = new Map(validProfiles.map(p => [p.id, p]));

      return uniqueMembers
        .map((m) => {
        const profile = profileMap.get(m.user_id);
        if (!profile) return null;
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || '',
          role: m.role || 'member',
          avatar: profile.avatar_url || undefined,
          initials: profile.initials || profile.name.slice(0, 2).toUpperCase(),
        };
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
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, name, email, avatar_url, initials, deleted_at)
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const seen = new Set<string>();
      return (data || [])
        .map((m: any) => {
          const profile = m.profile;
          if (!profile || profile.deleted_at || !profile.id || !profile.name) return null;
          if (seen.has(profile.id)) return null;
          seen.add(profile.id);
          return {
            id: profile.id,
            name: profile.name,
            email: profile.email || '',
            role: m.role || 'member',
            avatar: profile.avatar_url || undefined,
            initials: profile.initials || profile.name.slice(0, 2).toUpperCase(),
          };
        })
        .filter((member): member is TeamMember => member !== null);
    },
    enabled: !!projectId,
  });
}
