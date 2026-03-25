import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { projectsService } from '@/services/projects.service';
import { queryKeys } from '@/lib/queryClient';
import { TeamMember } from '@/types';
import { config } from '@/config';

const isValidUuid = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  // Accept canonical UUID format; avoids inserting obviously-invalid IDs into Set-based dedup.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

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
      let invalidUserIdCount = 0;
      const uniqueMembers = members.filter((m) => {
        const userId = (m as any)?.user_id;
        if (!isValidUuid(userId)) {
          invalidUserIdCount++;
          return false;
        }
        if (seenUserIds.has(userId)) return false;
        seenUserIds.add(userId);
        return true;
      });
      const userIds = uniqueMembers.map(m => (m as any).user_id).filter(isValidUuid);

      if (!config.isProduction && invalidUserIdCount > 0) {
        console.warn('[useOrganizationMembers] filtered invalid organization_members.user_id', { invalidUserIdCount });
      }

      // Fetch profiles separately to avoid ambiguous FK join
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials, deleted_at')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const validProfiles = (profiles || []).filter((p) =>
        (p.deleted_at ?? null) === null &&
        isValidUuid(p.id) &&
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
          initials: profile.initials || String(profile.name).slice(0, 2).toUpperCase(),
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
      let invalidProfileIdCount = 0;
      const mappedMembers = (data || [])
        .map((m: any) => {
          const profile = m.profile;
          const profileId = profile?.id;
          const deletedAt = profile?.deleted_at ?? null;
          if (!profile || deletedAt !== null) return null;
          if (!isValidUuid(profileId) || !profile?.name) {
            if (!isValidUuid(profileId)) invalidProfileIdCount++;
            return null;
          }
          if (seen.has(profileId)) return null;
          seen.add(profileId);
          return {
            id: profileId,
            name: profile.name,
            email: profile.email || '',
            role: m.role || 'member',
            avatar: profile.avatar_url || undefined,
            initials: profile.initials || String(profile.name).slice(0, 2).toUpperCase(),
          };
        })
        .filter((member): member is TeamMember => member !== null);

      if (!config.isProduction && invalidProfileIdCount > 0) {
        console.warn('[useProjectMembers] filtered invalid project_members.profile.id', { invalidProfileIdCount });
      }

      return mappedMembers;
    },
    enabled: !!projectId,
  });
}
