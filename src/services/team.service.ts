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

export interface TeamInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  token: string;
  invited_by: string | null;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export const teamService = {
  async getAll(): Promise<TeamMember[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id, role, joined_at')
      .eq('organization_id', orgId);

    if (membersError) throw membersError;
    if (!members?.length) return [];

    const userIds = members.map(m => m.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, initials, avatar_url, created_at, updated_at, deleted_at')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    for (const p of (profilesData || [])) {
      if (!p.deleted_at) {
        profileMap.set(p.id, p);
      }
    }

    const teamMembers: TeamMember[] = [];

    for (const member of members) {
      const profile = profileMap.get(member.user_id);
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

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, joined_at')
      .eq('user_id', id)
      .single();

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
    const { data, error } = await supabase.functions.invoke('send-team-invite', {
      body: { email, role, orgId },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    if (data?.warning) {
      console.warn('Invite warning:', data.warning);
    }
  },

  async getPendingInvitations(orgId: string): Promise<TeamInvitation[]> {
    const { data, error } = await supabase
      .from('team_invitations' as any)
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as TeamInvitation[];
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('team_invitations' as any)
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
  },

  async getInvitationByToken(token: string): Promise<TeamInvitation | null> {
    const { data, error } = await supabase.functions.invoke('accept-invite', {
      body: { token, action: 'get' },
    });
    // We won't use this — the signup page will just store the token
    // and call accept-invite after signup
    return null;
  },

  async acceptInvitation(token: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('accept-invite', {
      body: { token },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
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
