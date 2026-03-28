import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  normalizeInviteEmail,
  inviteMatchesAnyEmail,
  candidateEmailsFromAuthUser,
} from '@/utils/inviteEmail';

export type Profile = Tables<'profiles'>;
export type OrganizationMember = Tables<'organization_members'>;
export type TeamInvitationRow = Tables<'team_invitations'>;

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
  created_at: string | null;
  // Included when selecting `organizations(name)` in queries.
  organizations?: { name?: string | null };
}

export type InviteOutcome = 'sent' | 'already_pending' | 'created_without_email';

export interface InviteResult {
  outcome: InviteOutcome;
  message?: string;
}

export const normalizeEmail = normalizeInviteEmail;

export const teamService = {
  async acceptInvitationDirectFallback(invitationIdentifier: string): Promise<void> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You need to be logged in to accept an invitation');
    }

    const byIdRes = await supabase
      .from('team_invitations')
      .select('*')
      .eq('id', invitationIdentifier)
      .eq('status', 'pending')
      .maybeSingle();

    if (byIdRes.error) {
      throw new Error(
        `Failed to load invitation (id=${invitationIdentifier}): ${byIdRes.error.message}`
      );
    }

    let invitation: TeamInvitationRow | null = byIdRes.data;
    if (!invitation) {
      const byTokenRes = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', invitationIdentifier)
        .eq('status', 'pending')
        .maybeSingle();

      if (byTokenRes.error) throw new Error(byTokenRes.error.message);

      invitation = byTokenRes.data;
    }

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Invitation has expired');
    }

    if (!invitation.email) {
      throw new Error('Invitation is missing an email address');
    }

    const { data: profileRow } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    const candidates = [
      ...candidateEmailsFromAuthUser(user),
      normalizeInviteEmail(profileRow?.email),
    ].filter((e): e is string => Boolean(e));

    if (!inviteMatchesAnyEmail(invitation.email, candidates)) {
      throw new Error('This invitation is for a different email address');
    }

    // Try to mark the invitation as accepted. This reduces concurrency issues,
    // but we intentionally keep membership insertion idempotent below.
    const nowIso = new Date().toISOString();
    const { error: acceptError } = await supabase
      .from('team_invitations')
      .update({ status: 'accepted', accepted_at: nowIso })
      .eq('id', invitation.id)
      .eq('status', 'pending')
      .gte('expires_at', nowIso);

    if (acceptError) {
      // If someone else accepted concurrently, the update might affect 0 rows;
      // Supabase returns null data + null error in that case.
      throw new Error(acceptError.message || 'Failed to accept invitation');
    }

    // Idempotent membership insert to handle concurrent accepts.
    const { error: upsertError } = await supabase
      .from('organization_members')
      .upsert(
        {
          organization_id: invitation.organization_id,
          user_id: user.id,
          role: invitation.role || 'member',
          invited_by: invitation.invited_by || null,
        },
        { onConflict: 'organization_id,user_id', ignoreDuplicates: true }
      );

    if (upsertError) {
      throw new Error(upsertError.message || 'Failed to join organization');
    }
  },

  async acceptInvitationViaRpc(invitationIdentifier: string): Promise<void> {
    const { error } = await supabase.rpc('accept_team_invitation', {
      p_invitation_identifier: invitationIdentifier,
    });

    if (error) {
      throw new Error(error.message || 'Failed to accept invitation');
    }
  },

  async getAll(orgId?: string): Promise<TeamMember[]> {
    if (orgId) {
      return this.getByOrganization(orgId);
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: memberships, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);

    if (membershipError) throw membershipError;
    if (!memberships?.length) return [];

    return this.getByOrganization(memberships[0].organization_id);
  },

  async getByOrganization(orgId: string): Promise<TeamMember[]> {
    const { data: members, error: membersError } = await supabase
      .from('organization_members')
      .select('user_id, role, joined_at, department')
      .eq('organization_id', orgId);

    if (membersError) throw membersError;
    if (!members?.length) return [];

    const userIds = members.map(m => m.user_id);

    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map<string, Profile>();
    for (const p of (profilesData || [])) {
      if (!p.deleted_at) {
        profileMap.set(p.id, p);
      }
    }

    // Fetch all project_member counts in one query instead of one per user (N+1 fix).
    const { data: projectMemberRows } = await supabase
      .from('project_members')
      .select('user_id')
      .in('user_id', userIds);

    const projectCountMap = new Map<string, number>();
    for (const row of (projectMemberRows || [])) {
      projectCountMap.set(row.user_id, (projectCountMap.get(row.user_id) ?? 0) + 1);
    }

    const teamMembers: TeamMember[] = [];

    for (const member of members) {
      const profile = profileMap.get(member.user_id);
      if (!profile) continue;

      teamMembers.push({
        ...profile,
        role: member.role,
        status: 'active' as const,
        department: (member as Record<string, unknown>).department as string | undefined || undefined,
        projectCount: projectCountMap.get(member.user_id) ?? 0,
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

  async invite(email: string, role: string, orgId: string): Promise<InviteResult> {
    const { data, error } = await supabase.functions.invoke<Record<string, unknown>>('send-team-invite', {
      body: { email, role, orgId },
    });

    if (error) {
      // Supabase wraps non-2xx responses in FunctionsHttpError. Try to extract a user-facing server message.
      const errorWithContext = error as { context?: { json?: () => Promise<Record<string, unknown>>; text?: () => Promise<string> } };
      let serverMessage: string | null = null;
      try {
        if (errorWithContext.context?.json) {
          const parsed = await errorWithContext.context.json();
          if (parsed && typeof parsed.error === 'string') {
            serverMessage = parsed.error;
          }
        } else if (errorWithContext.context?.text) {
          const raw = await errorWithContext.context.text();
          if (raw) {
            serverMessage = raw;
          }
        }
      } catch {
        // Fallback to generic error message below.
      }
      const resolvedMessage = (serverMessage || error.message || '').toLowerCase();
      if (resolvedMessage.includes('already pending')) {
        return { outcome: 'already_pending', message: serverMessage || error.message };
      }
      if (resolvedMessage.includes('app_url is not configured')) {
        return { outcome: 'created_without_email', message: serverMessage || error.message };
      }
      throw new Error(serverMessage || error.message || 'Failed to send invitation');
    }

    if ((data as Record<string, unknown>)?.error) {
      const dataError = String((data as Record<string, unknown>).error || '');
      const lowered = dataError.toLowerCase();
      if (lowered.includes('already pending')) {
        return { outcome: 'already_pending', message: dataError };
      }
      if (lowered.includes('app_url is not configured')) {
        return { outcome: 'created_without_email', message: dataError };
      }
      throw new Error(dataError);
    }
    if ((data as Record<string, unknown>)?.warning) {
      console.warn('Invite warning:', (data as Record<string, unknown>).warning);
      return { outcome: 'created_without_email', message: String((data as Record<string, unknown>).warning) };
    }

    return { outcome: 'sent' };
  },

  async getPendingInvitations(orgId: string): Promise<TeamInvitation[]> {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as TeamInvitation[];
  },

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('team_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (error) throw error;
  },

  async getInvitationByToken(_token: string): Promise<TeamInvitation | null> {
    // The invite flow uses the invitation ID stored in sessionStorage at signup time.
    // This method is retained for interface compatibility but is otherwise unused.
    return null;
  },

  /**
   * Get all pending invitations addressed to a specific email address.
   * Used by Dashboard so it doesn't need a direct inline Supabase query.
   */
  async getPendingInvitationsForUser(email: string): Promise<TeamInvitation[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const normalizedEmail = normalizeInviteEmail(email);
    if (!normalizedEmail) return [];
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*, organizations(name)')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    const pending = (data || []) as TeamInvitation[];
    if (!user || pending.length === 0) return pending;

    const orgIds = Array.from(new Set(pending.map((inv) => inv.organization_id)));
    if (orgIds.length === 0) return pending;

    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .in('organization_id', orgIds);

    const memberOrgIds = new Set((memberships || []).map((m) => m.organization_id));
    return pending.filter((inv) => !memberOrgIds.has(inv.organization_id));
  },

  async acceptInvitation(invitationIdentifier: string): Promise<void> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Failed to retrieve authentication session during invite acceptance');
      throw new Error('Unable to retrieve your session. Please try again later.');
    }
    
    if (!session?.access_token) {
      console.error('Authentication session exists but access token is missing');
      throw new Error('You need to be logged in to accept an invitation');
    }

    const invokeAccept = () =>
      supabase.functions.invoke<Record<string, unknown>>('accept-invite', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { inviteId: invitationIdentifier, token: invitationIdentifier },
      });

    // Handle short deployment propagation windows where first call may still see 404.
    // Explicit retry cap prevents pathological retry loops.
    const MAX_404_RETRIES = 1;
    const shouldRetry404 = (message: string | undefined) =>
      !!message && /404|not found/i.test(message);

    let response = await invokeAccept();
    for (let i = 0; i < MAX_404_RETRIES; i++) {
      const msg = response.error?.message || '';
      if (!response.error || !shouldRetry404(msg)) break;
      console.warn('[teamService.acceptInvitation] retrying accept-invite after 404', { attempt: i + 1 });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      response = await invokeAccept();
    }

    const maskedInvitationId = invitationIdentifier.length > 8
      ? `${invitationIdentifier.slice(0, 6)}...${invitationIdentifier.slice(-2)}`
      : invitationIdentifier;
    const finalMsg = response.error?.message || '';
    if (response.error && shouldRetry404(finalMsg) && MAX_404_RETRIES >= 1) {
      console.warn('[teamService.acceptInvitation] accept-invite still returning 404 after retries', {
        invitationId: maskedInvitationId,
      });
    }

    if (response.error) {
      try {
        await this.acceptInvitationViaRpc(invitationIdentifier);
        return;
      } catch {
        // Final fallback: handle acceptance directly through table operations.
        await this.acceptInvitationDirectFallback(invitationIdentifier);
        return;
      }
    }
    if ((response.data as Record<string, unknown>)?.error) {
      try {
        await this.acceptInvitationViaRpc(invitationIdentifier);
        return;
      } catch {
        await this.acceptInvitationDirectFallback(invitationIdentifier);
        return;
      }
    }
  },

  async updateRole(memberId: string, role: string, orgId: string): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role: role as 'owner' | 'admin' | 'member' })
      .eq('user_id', memberId)
      .eq('organization_id', orgId);

    if (error) throw error;
  },

  async updateMember(memberId: string, orgId: string, updates: { role?: string; department?: string }): Promise<void> {
    const updateData: Record<string, string> = {};
    if (updates.role) updateData.role = updates.role as 'owner' | 'admin' | 'member';
    if (updates.department !== undefined) updateData.department = updates.department;

    const { error } = await supabase
      .from('organization_members')
      .update(updateData)
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
