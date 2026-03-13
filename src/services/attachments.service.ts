import { supabase } from '@/integrations/supabase/client';

export interface AttachmentRecord {
  id: string;
  entity_id: string;
  entity_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  project_id: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  url?: string;
}

export interface CreateAttachmentInput {
  entity_id: string;
  entity_type: 'project' | 'task' | 'issue' | 'milestone' | 'module';
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  project_id?: string;
}

export const attachmentsService = {
  /**
   * Create an attachment record in the database
   */
  async create(input: CreateAttachmentInput): Promise<AttachmentRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('attachments')
      .insert({
        entity_id: input.entity_id,
        entity_type: input.entity_type,
        file_name: input.file_name,
        file_path: input.file_path,
        file_size: input.file_size || null,
        mime_type: input.mime_type || null,
        project_id: input.project_id || null,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating attachment:', error);
      throw new Error(`Failed to create attachment: ${error.message}`);
    }

    // Generate URL for the created attachment
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(input.file_path);

    return { ...data, url: publicUrl };
  },

  /**
   * Create multiple attachment records
   */
  async createMany(inputs: CreateAttachmentInput[]): Promise<AttachmentRecord[]> {
    if (inputs.length === 0) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = inputs.map(input => ({
      entity_id: input.entity_id,
      entity_type: input.entity_type,
      file_name: input.file_name,
      file_path: input.file_path,
      file_size: input.file_size || null,
      mime_type: input.mime_type || null,
      project_id: input.project_id || null,
      uploaded_by: user.id,
    }));

    const { data, error } = await supabase
      .from('attachments')
      .insert(records)
      .select();

    if (error) {
      console.error('Error creating attachments:', error);
      throw new Error(`Failed to create attachments: ${error.message}`);
    }

    // Generate URLs for created attachments
    return (data || []).map(record => {
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(record.file_path);
      return { ...record, url: publicUrl };
    });
  },

  /**
   * Get all attachments for a project
   */
  async getByProject(projectId: string, includeAllEntities: boolean = false): Promise<AttachmentRecord[]> {
    let query = supabase
      .from('attachments')
      .select('*')
      .eq('project_id', projectId);

    if (!includeAllEntities) {
      query = query.eq('entity_type', 'project');
    }

    const { data, error } = await query.order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching project attachments:', error);
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    // Generate public URLs for all attachments
    return (data || []).map(record => {
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(record.file_path);
      return { ...record, url: publicUrl };
    });
  },

  /**
   * Get attachments for a specific entity (task, issue, etc.)
   */
  async getByEntity(entityId: string, entityType: string): Promise<AttachmentRecord[]> {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching entity attachments:', error);
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    // Generate public URLs for all attachments
    return (data || []).map(record => {
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(record.file_path);
      return { ...record, url: publicUrl };
    });
  },

  /**
   * Delete an attachment (removes from storage as well)
   */
  async delete(attachmentId: string): Promise<void> {
    // First get the attachment to know the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching attachment:', fetchError);
      throw new Error(`Failed to find attachment: ${fetchError.message}`);
    }

    // Delete from storage
    if (attachment?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([attachment.file_path]);

      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
        // Continue to delete the record even if storage delete fails
      }
    }

    // Delete the record
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Error deleting attachment:', error);
      throw new Error(`Failed to delete attachment: ${error.message}`);
    }
  },
};
