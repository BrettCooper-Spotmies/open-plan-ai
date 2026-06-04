import type { TeamMember } from '@/types';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  memberCount?: number;
  projectCount?: number;
}

export interface OrgMember extends TeamMember {
  orgRole: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  userId: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  orgId: string;
  invitedBy: TeamMember;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrgPayload {
  name: string;
  description?: string;
}

export interface InviteMemberPayload {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}
