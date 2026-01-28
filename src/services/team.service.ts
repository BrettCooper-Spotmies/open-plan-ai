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
    // Get organization members with their profiles
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles!organization_members_user_id_fkey (
          id,
          name,
          email,
          initials,
          avatar_url,
          created_at,
          updated_at,
          deleted_at
        )
      `)
      .eq('organization_id', orgId);

    if (error) throw error;

    // Get project counts for each member
    const teamMembers: TeamMember[] = [];
    
    for (const member of members || []) {
      const profile = member.profiles as unknown as Profile;
      if (!profile) continue;

      // Count projects the member is part of
      const { count } = await supabase
        .from('project_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', member.user_id);

      teamMembers.push({
        ...profile,
        role: member.role,
        status: 'active',
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
