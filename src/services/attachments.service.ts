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
  async create(_input: CreateAttachmentInput): Promise<AttachmentRecord> {
    throw new Error('File attachments are not yet supported');
  },
  async getByEntity(_entityId: string, _entityType: string): Promise<AttachmentRecord[]> {
    return [];
  },
  async delete(_id: string): Promise<void> {
    throw new Error('File attachments are not yet supported');
  },
};
