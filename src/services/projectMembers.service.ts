import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProjectRole = Database['public']['Enums']['project_role'];

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
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
  role?: ProjectRole;
}

export const projectMembersService = {
  /**
   * Add a member to a project
   */
  async addMember(input: AddProjectMemberInput): Promise<ProjectMember> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: input.project_id,
        user_id: input.user_id,
        role: input.role || 'member',
        added_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding project member:', error);
      throw new Error(`Failed to add project member: ${error.message}`);
    }

    return data;
  },

  /**
   * Add multiple members to a project at once
   */
  async addMembers(projectId: string, members: { userId: string; role?: ProjectRole }[]): Promise<ProjectMember[]> {
    if (members.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = members.map(member => ({
      project_id: projectId,
      user_id: member.userId,
      role: member.role || 'member' as ProjectRole,
      added_by: user.id,
    }));

    const { data, error } = await supabase
      .from('project_members')
      .insert(records)
      .select();

    if (error) {
      console.error('Error adding project members:', error);
      throw new Error(`Failed to add project members: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get all members for a project with their profiles
   */
  async getByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles(id, name, email, avatar_url, initials)
      `)
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching project members:', error);
      throw new Error(`Failed to fetch project members: ${error.message}`);
    }

    return (data || []).map((member: any) => ({
      ...member,
      profile: member.profile || undefined,
    }));
  },

  /**
   * Update a member's role in a project
   */
  async updateRole(projectId: string, userId: string, role: ProjectRole): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .update({ role })
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
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing project member:', error);
      throw new Error(`Failed to remove project member: ${error.message}`);
    }
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
};
