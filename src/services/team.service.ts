import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'>;
export type OrganizationMember = Tables<'organization_members'>;

export interface TeamMember extends Profile {
  role: string;
  status: 'active' | 'inactive' | 'pending';
  department?: string;
  projectCount: number;
  joinedAt: string | null;
}

export const teamService = {
  async getAll(): Promise<TeamMember[]> {
    // Get current user's organization
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the user's organization membership
    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);

    if (membershipError) throw membershipError;
    if (!memberships?.length) return [];

    const orgId = memberships[0].organization_id;
    return this.getByOrganization(orgId);
  },

  async getByOrganization(orgId: string): Promise<TeamMember[]> {
    // Step 1: Get organization members
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id, role, joined_at')
      .eq('organization_id', orgId);

    if (membersError) throw membersError;
    if (!members?.length) return [];

    // Step 2: Get profiles for all member user_ids
    const userIds = members.map(m => m.user_id);

    // Query profiles - try by 'id' first (migration design: profiles.id = auth.users.id)
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, initials, avatar_url, created_at, updated_at, deleted_at')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    let resolvedProfiles = profilesData || [];

    // If no profiles found by id, try by user_id column (actual DB may differ)
    if (resolvedProfiles.length === 0) {
      const { data: profilesByUserId, error: profilesByUserIdError } = await (supabase
        .from('profiles') as any)
        .select('id, user_id, name, email, initials, avatar_url, created_at, updated_at, deleted_at')
        .in('user_id', userIds);

      if (!profilesByUserIdError && profilesByUserId?.length) {
        // For user_id-based profiles, we need to map user_id -> profile
        const userIdProfileMap = new Map<string, any>();
        for (const p of profilesByUserId) {
          if (!p.deleted_at) {
            userIdProfileMap.set(p.user_id, p);
          }
        }

        // Build team members using user_id-based map
        const teamMembers: TeamMember[] = [];
        for (const member of members) {
          const profile = userIdProfileMap.get(member.user_id);
          if (!profile) continue;

          const { count } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id);

          teamMembers.push({
            ...profile,
            role: member.role,
            status: 'active' as const,
            projectCount: count || 0,
            joinedAt: member.joined_at,
          });
        }
        return teamMembers;
      }
    }

    // Build a lookup map: id -> profile (for id-based matching)
    const profileMap = new Map<string, any>();
    for (const p of resolvedProfiles) {
      if (!p.deleted_at) {
        profileMap.set(p.id, p);
      }
    }

    // Step 3: Combine members with profiles and get project counts
    const teamMembers: TeamMember[] = [];

    for (const member of members) {
      const profile = profileMap.get(member.user_id);
      if (!profile) continue;

      // Count projects the member is part of
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id);

      teamMembers.push({
        ...profile,
        role: member.role,
        status: 'active' as const,
        projectCount: count || 0,
        joinedAt: member.joined_at,
      });
    }

    return teamMembers;
  },

  async getById(id: string): Promise<TeamMember | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // Get membership info
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, joined_at')
      .eq('user_id', id)
      .single();

    // Get project count
    const { count } = await supabase
      .from('project_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', id);

    return {
      ...profile,
      role: membership?.role || 'member',
      status: 'active',
      projectCount: count || 0,
      joinedAt: membership?.joined_at || null,
    };
  },

  async invite(email: string, role: string, orgId: string): Promise<void> {
    // This would typically send an invitation email
    // For now, we'll just log the intent
    console.log('Inviting user:', { email, role, orgId });
    // In production, this would call an edge function to send the invite
  },

  async updateRole(memberId: string, role: string, orgId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: role as 'owner' | 'admin' | 'member' })
      .eq('user_id', memberId)
      .eq('organization_id', orgId);

    if (error) throw error;
  },

  async remove(memberId: string, orgId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('user_id', memberId)
      .eq('organization_id', orgId);

    if (error) throw error;
  },
};
