import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { activitiesService } from './activities.service';

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

    return data;
  },

  /**
   * Add multiple members to a project at once
   */
  async addMembers(projectId: string, members: { userId: string; role?: string }[]): Promise<ProjectMember[]> {
    if (members.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = members.map(member => ({
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

    return data || [];
  },

  /**
   * Get all members for a project with their profiles
   */
  async getByProject(projectId: string): Promise<ProjectMemberWithProfile[]> {
    // Step 1: Get project members
    const { data: members, error: membersError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId);

    if (membersError) {
      console.error('Error fetching project members:', membersError);
      throw new Error(`Failed to fetch project members: ${membersError.message}`);
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Step 2: Get profiles for these users
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Create a map of profiles by id for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    // Merge members with their profiles
    return members.map((member: any) => ({
      ...member,
      profile: profileMap.get(member.user_id) || undefined,
    }));
  },

  /**
   * Update a member's role in a project
   */
  async updateRole(projectId: string, userId: string, role: string): Promise<void> {
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

  /**
   * Remove multiple members from a project
   */
  async removeMembers(projectId: string, userIds: string[]): Promise<void> {
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
  },
};
