import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { activitiesService } from './activities.service';

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

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    activitiesService.create({
      project_id: data.project_id,
      activity_type: 'milestone_reached',
      description: `created milestone "${data.name}"`,
      user_id: user?.id || null,
      entity_id: data.id,
      entity_type: 'milestone',
    }).catch(() => { /* non-critical */ });

    return data;
  },

  async createMany(milestones: MilestoneInsert[]): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .insert(milestones)
      .select();

    if (error) throw error;
    return data || [];
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

  async updateMany(updates: { id: string; name?: string; due_date?: string | null }[]): Promise<void> {
    try {
      const { error } = await (supabase.rpc as any)('batch_update_milestones', { updates });
      if (error) throw error;
    } catch (err) {
      console.warn('Batch update RPC failed, falling back to sequential update:', err);
      await Promise.all(updates.map(u => this.update(u.id, { 
        name: u.name, 
        due_date: u.due_date 
      } as MilestoneUpdate)));
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase.rpc as any)('soft_delete_milestone', { milestone_id: id });
    if (error) {
      console.error('[milestonesService] soft_delete_milestone failed', error);
      throw error;
    }
  },

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await (supabase.rpc as any)('batch_soft_delete_milestones', { milestone_ids: ids });
    if (error) {
      console.error('[milestonesService] batch_soft_delete_milestones failed', error);
      throw error;
    }
  },

  async getUpcoming(limit: number = 5): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .is('deleted_at', null)
      .gte('due_date', format(new Date(), 'yyyy-MM-dd'))
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },
};
