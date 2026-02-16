import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Module = Tables<'modules'>;
export type ModuleInsert = TablesInsert<'modules'>;
export type ModuleUpdate = TablesUpdate<'modules'>;

export const modulesService = {
  async getAll(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getByProjectId(projectId: string): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Module | null> {
    const { data, error } = await supabase
      .from('modules')
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

  async create(module: ModuleInsert): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .insert(module)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: ModuleUpdate): Promise<Module> {
    const { data, error } = await supabase
      .from('modules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.rpc('soft_delete_module', { module_id: id });

    if (error) throw error;
  },
};
