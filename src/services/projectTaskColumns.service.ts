import { supabase } from '@/integrations/supabase/client';

export interface ProjectTaskColumn {
  id: string;
  status: string;
  label: string;
  color: string;
  isSpecial?: boolean;
}

interface ProjectTaskColumnRow {
  column_id: string;
  status: string;
  label: string;
  color: string;
  is_special: boolean;
  position: number;
}

const mapRowToColumn = (row: ProjectTaskColumnRow): ProjectTaskColumn => ({
  id: row.column_id,
  status: row.status,
  label: row.label,
  color: row.color,
  isSpecial: row.is_special,
});

export const projectTaskColumnsService = {
  async getByProjectId(projectId: string): Promise<ProjectTaskColumn[]> {
    const { data, error } = await supabase
      .from('project_task_columns')
      .select('column_id, status, label, color, is_special, position')
      .eq('project_id', projectId)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRowToColumn);
  },

  async replaceForProject(projectId: string, columns: ProjectTaskColumn[]): Promise<ProjectTaskColumn[]> {
    const { error: deleteError } = await supabase
      .from('project_task_columns')
      .delete()
      .eq('project_id', projectId);

    if (deleteError) throw deleteError;

    if (columns.length === 0) return [];

    const payload = columns.map((column, index) => ({
      project_id: projectId,
      column_id: column.id,
      status: column.status,
      label: column.label,
      color: column.color,
      is_special: column.isSpecial ?? false,
      position: index,
    }));

    const { data, error } = await supabase
      .from('project_task_columns')
      .insert(payload)
      .select('column_id, status, label, color, is_special, position')
      .order('position', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapRowToColumn);
  },
};
