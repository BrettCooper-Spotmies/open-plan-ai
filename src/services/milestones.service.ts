import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Milestone = Tables<'milestones'>;
export type MilestoneInsert = TablesInsert<'milestones'>;
export type MilestoneUpdate = TablesUpdate<'milestones'>;

export const milestonesService = {
  async getAll(): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByProjectId(projectId: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Milestone | null> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async create(milestone: MilestoneInsert): Promise<Milestone> {
    const { data, error } = await supabase
      .from('milestones')
      .insert(milestone)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: MilestoneUpdate): Promise<Milestone> {
    const { data, error } = await supabase
      .from('milestones')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_milestone', { milestone_id: id });

    if (error) throw error;
  },

  async getUpcoming(limit: number = 5): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .is('deleted_at', null)
      .gte('due_date', new Date().toISOString().split('T')[0])
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
