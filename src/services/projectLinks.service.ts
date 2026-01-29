import { supabase } from '@/integrations/supabase/client';

export interface ProjectLink {
  id: string;
  project_id: string;
  name: string;
  url: string;
  created_by: string | null;
  created_at: string | null;
  deleted_at: string | null;
}

export interface CreateProjectLinkInput {
  project_id: string;
  name: string;
  url: string;
}

export interface UpdateProjectLinkInput {
  name?: string;
  url?: string;
}

export const projectLinksService = {
  /**
   * Create a new project link
   */
  async create(input: CreateProjectLinkInput): Promise<ProjectLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('project_links')
      .insert({
        project_id: input.project_id,
        name: input.name,
        url: input.url,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project link:', error);
      throw new Error(`Failed to create project link: ${error.message}`);
    }

    return data;
  },

  /**
   * Create multiple project links at once
   */
  async createMany(projectId: string, links: { name: string; url: string }[]): Promise<ProjectLink[]> {
    if (links.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = links.map(link => ({
      project_id: projectId,
      name: link.name,
      url: link.url,
      created_by: user.id,
    }));

    const { data, error } = await supabase
      .from('project_links')
      .insert(records)
      .select();

    if (error) {
      console.error('Error creating project links:', error);
      throw new Error(`Failed to create project links: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get all links for a project
   */
  async getByProject(projectId: string): Promise<ProjectLink[]> {
    const { data, error } = await supabase
      .from('project_links')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching project links:', error);
      throw new Error(`Failed to fetch project links: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Update an existing project link
   */
  async update(linkId: string, input: UpdateProjectLinkInput): Promise<ProjectLink> {
    const { data, error } = await supabase
      .from('project_links')
      .update(input)
      .eq('id', linkId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project link:', error);
      throw new Error(`Failed to update project link: ${error.message}`);
    }

    return data;
  },

  /**
   * Soft delete a project link
   */
  async delete(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('project_links')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', linkId);

    if (error) {
      console.error('Error deleting project link:', error);
      throw new Error(`Failed to delete project link: ${error.message}`);
    }
  },

  /**
   * Hard delete a project link (permanent)
   */
  async hardDelete(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('project_links')
      .delete()
      .eq('id', linkId);

    if (error) {
      console.error('Error deleting project link:', error);
      throw new Error(`Failed to delete project link: ${error.message}`);
    }
  },
};
