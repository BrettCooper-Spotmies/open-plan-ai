import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { activitiesService } from './activities.service';
import { chatService } from './chat.service';

type ProjectRole = Database['public']['Enums']['project_role'];

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  added_at: string | null;
  added_by: string | null;
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    initials: string;
  };
}

export interface AddProjectMemberInput {
  project_id: string;
  user_id: string;
  role?: string;
}

export const projectMembersService = {
  async assertProjectMemberManager(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, created_by, deleted_at')
      .eq('id', projectId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to validate project access: ${error.message}`);
    }

    if (!project || project.deleted_at) {
      throw new Error('Project not found');
    }

    const isCreator = !!project.created_by && project.created_by === user.id;
    if (isCreator) return;

    const { data: membership, error: membershipError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Failed to validate project role: ${membershipError.message}`);
    }

    const isAdmin = (membership?.role || '').toLowerCase() === 'admin';
    if (!isAdmin) {
      throw new Error('Only the project creator or an Admin can manage project members');
    }
  },

  /**
   * Add a member to a project
   */
  async addMember(input: AddProjectMemberInput): Promise<ProjectMember> {
    await this.assertProjectMemberManager(input.project_id);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: existingMember } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', input.project_id)
      .eq('user_id', input.user_id)
      .maybeSingle();

    if (existingMember) {
      throw new Error('This person is already a project member');
    }

    // Guard against stale user ids that no longer have a profile row.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, deleted_at')
      .eq('id', input.user_id)
      .maybeSingle();

    if (!profile || profile.deleted_at) {
      throw new Error('Selected member is no longer available');
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: input.project_id,
        user_id: input.user_id,
        role: input.role || '',
        added_by: user.id,
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding project member:', error);
      throw new Error(`Failed to add project member: ${error.message}`);
    }

    // Log activity (fire-and-forget)
    activitiesService.create({
      project_id: input.project_id,
      activity_type: 'project_assigned',
      description: `assigned a new member to the project`,
      user_id: user.id,
      entity_id: input.user_id,
      entity_type: 'user',
    }).catch(() => { /* non-critical */ });

    // Keep project chat membership in sync.
    chatService.syncProjectGroupMembers(input.project_id).catch(() => { /* non-critical */ });

    return data;
  },

  /**
   * Add multiple members to a project at once
   */
  async addMembers(projectId: string, members: { userId: string; role?: string }[]): Promise<ProjectMember[]> {
    await this.assertProjectMemberManager(projectId);

    if (members.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const uniqueMembers = Array.from(
      new Map(members.map((member) => [member.userId, member])).values()
    );

    const memberIds = uniqueMembers.map((member) => member.userId);
    const { data: existingMembers } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .in('user_id', memberIds);

    const existingMemberIds = new Set((existingMembers || []).map((member) => member.user_id));
    const nonDuplicateMembers = uniqueMembers.filter((member) => !existingMemberIds.has(member.userId));

    if (nonDuplicateMembers.length === 0) {
      return [];
    }

    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, deleted_at')
      .in('id', nonDuplicateMembers.map((member) => member.userId));

    if (profileError) {
      throw new Error(`Failed to validate project members: ${profileError.message}`);
    }

    const validProfileIds = new Set(
      (profiles || [])
        .filter((profile) => !profile.deleted_at)
        .map((profile) => profile.id)
    );

    const validMembers = nonDuplicateMembers.filter((member) => validProfileIds.has(member.userId));
    const invalidCount = nonDuplicateMembers.length - validMembers.length;

    if (validMembers.length === 0) {
      throw new Error('Selected members are no longer available. Please refresh and try again.');
    }

    const records = validMembers.map(member => ({
      project_id: projectId,
      user_id: member.userId,
      role: member.role || '',
      added_by: user.id,
    }));

    const { data, error } = await supabase
      .from('project_members')
      .insert(records as any)
      .select();

    if (error) {
      console.error('Error adding project members:', error);
      throw new Error(`Failed to add project members: ${error.message}`);
    }

    if (invalidCount > 0) {
      console.warn(`Skipped ${invalidCount} invalid project member(s) without profile rows`);
    }

    chatService.syncProjectGroupMembers(projectId).catch(() => { /* non-critical */ });

    return data || [];
  },

  /**
   * Get all members for a project with their profiles.
   * Uses a single join query to avoid multiple database round trips.
   */
  async getByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        id,
        project_id,
        user_id,
        role,
        added_at,
        added_by,
        profile:profiles!fk_project_members_user_id (
          id,
          name,
          email,
          avatar_url,
          initials
        )
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching project members with profiles:', error);
      throw new Error(`Failed to fetch project members: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Normalise the embedded profile (Supabase returns it as an object or null)
    return data.map((row: any) => ({
      id: row.id,
      project_id: row.project_id,
      user_id: row.user_id,
      role: row.role,
      added_at: row.added_at,
      added_by: row.added_by,
      profile: row.profile ?? undefined,
    }));
  },

  /**
   * Update a member's role in a project
   */
  async updateRole(projectId: string, userId: string, role: string): Promise<void> {
    await this.assertProjectMemberManager(projectId);

    const { error } = await supabase
      .from('project_members')
      .update({ role } as any)
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating project member role:', error);
      throw new Error(`Failed to update project member role: ${error.message}`);
    }
  },

  /**
   * Remove a member from a project
   */
  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.assertProjectMemberManager(projectId);

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing project member:', error);
      throw new Error(`Failed to remove project member: ${error.message}`);
    }

    chatService.syncProjectGroupMembers(projectId).catch(() => { /* non-critical */ });
  },

  /**
   * Check if a user is a member of a project
   */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking project membership:', error);
      return false;
    }

    return !!data;
  },

  /**
   * Remove multiple members from a project
   */
  async removeMembers(projectId: string, userIds: string[]): Promise<void> {
    await this.assertProjectMemberManager(projectId);

    if (userIds.length === 0) return;

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .in('user_id', userIds);

    if (error) {
      console.error('Error removing project members:', error);
      throw new Error(`Failed to remove project members: ${error.message}`);
    }

    chatService.syncProjectGroupMembers(projectId).catch(() => { /* non-critical */ });
  },
};
