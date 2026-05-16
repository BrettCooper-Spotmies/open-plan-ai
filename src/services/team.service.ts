import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import {
  normalizeInviteEmail,
  inviteMatchesAnyEmail,
  candidateEmailsFromAuthUser,
} from '@/utils/inviteEmail';

export { normalizeInviteEmail, inviteMatchesAnyEmail, candidateEmailsFromAuthUser };

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  department?: string;
  projectCount: number;
  joinedAt: string | null;
  // Kept for backward compatibility with consumers that read avatar_url (e.g. Reports.tsx)
  avatar_url?: string | null;
  initials: string;
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
  organizations?: { name?: string | null };
}

export type InviteOutcome = 'sent' | 'already_pending' | 'created_without_email';

export interface InviteResult {
  outcome: InviteOutcome;
  message?: string;
}

export const normalizeEmail = normalizeInviteEmail;

/** Map an API member response to the TeamMember shape. */
function fromApi(raw: Record<string, unknown>): TeamMember {
  return {
    id: raw.id as string,
    userId: (raw.userId ?? raw.user_id ?? raw.id) as string,
    name: (raw.name ?? '') as string,
    email: (raw.email ?? '') as string,
    role: (raw.role ?? 'member') as string,
    status: ((raw.status as string) ?? 'active') as 'active' | 'inactive' | 'pending',
    department: raw.department as string | undefined,
    projectCount: (raw.projectCount ?? 0) as number,
    joinedAt: (raw.joinedAt ?? raw.joined_at ?? null) as string | null,
    avatar_url: (raw.avatarUrl ?? raw.avatar_url ?? null) as string | null,
    initials: (raw.initials ?? '') as string,
  };
}

export const teamService = {
  async getAll(orgId?: string): Promise<TeamMember[]> {
    if (orgId) return this.getByOrganization(orgId);
    return [];
  },

  async getByOrganization(orgId: string): Promise<TeamMember[]> {
    const data = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId));
    return (data || []).map(fromApi);
  },

  async getById(id: string): Promise<TeamMember | null> {
    // No dedicated per-user endpoint in current API; return null gracefully.
    return null;
  },

  async invite(email: string, role: string, orgId: string, department?: string): Promise<InviteResult> {
    try {
      await apiClient.post<unknown>(ENDPOINTS.ORGANIZATIONS.INVITATIONS(orgId), {
        email,
        role,
        department: department?.trim() || undefined,
      });
      return { outcome: 'sent' };
    } catch (err: any) {
      const message: string = err?.response?.data?.error || err?.message || '';
      const lowered = message.toLowerCase();
      if (lowered.includes('already pending')) {
        return { outcome: 'already_pending', message };
      }
      if (lowered.includes('app_url is not configured')) {
        return { outcome: 'created_without_email', message };
      }
      throw new Error(message || 'Failed to send invitation');
    }
  },

  async getPendingInvitations(orgId: string): Promise<TeamInvitation[]> {
    const data = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.ORGANIZATIONS.INVITATIONS(orgId));
    return (data || []) as TeamInvitation[];
  },

  async getPendingInvitationsForUser(email: string): Promise<TeamInvitation[]> {
    // This endpoint isn't yet defined in ENDPOINTS; return empty for now.
    return [];
  },

  async cancelInvitation(invitationId: string, orgId: string): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.ORGANIZATIONS.REVOKE_INVITATION(orgId, invitationId));
  },

  async getInvitationByToken(_token: string): Promise<TeamInvitation | null> {
    return null;
  },

  async acceptInvitation(invitationIdentifier: string): Promise<void> {
    await apiClient.post<void>(ENDPOINTS.ORGANIZATIONS.ACCEPT_INVITATION, {
      token: invitationIdentifier,
    });
  },

  async updateRole(memberId: string, role: string, orgId: string): Promise<void> {
    await apiClient.patch<void>(ENDPOINTS.ORGANIZATIONS.MEMBER_ROLE(orgId, memberId), { role });
  },

  async updateMember(memberId: string, orgId: string, updates: { role?: string; department?: string }): Promise<void> {
    await apiClient.patch<void>(ENDPOINTS.ORGANIZATIONS.MEMBER_ROLE(orgId, memberId), updates);
  },

  async remove(memberId: string, orgId: string): Promise<void> {
    await apiClient.delete<void>(ENDPOINTS.ORGANIZATIONS.REMOVE_MEMBER(orgId, memberId));
  },
};
