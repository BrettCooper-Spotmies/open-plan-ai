export interface ProjectTaskColumn {
  id: string;
  status: string;
  label: string;
  color: string;
  isSpecial?: boolean;
}

const DEFAULT_COLUMNS: ProjectTaskColumn[] = [
  { id: 'backlog', status: 'backlog', label: 'Backlog', color: '#6b7280' },
  { id: 'todo', status: 'todo', label: 'To Do', color: '#3b82f6' },
  { id: 'in_progress', status: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'in_review', status: 'in_review', label: 'In Review', color: '#8b5cf6' },
  { id: 'done', status: 'done', label: 'Done', color: '#10b981', isSpecial: true },
  { id: 'cancelled', status: 'cancelled', label: 'Cancelled', color: '#ef4444', isSpecial: true },
];

export const projectTaskColumnsService = {
  async getByProjectId(_projectId: string): Promise<ProjectTaskColumn[]> {
    return DEFAULT_COLUMNS;
  },

  async replaceForProject(
    _projectId: string,
    columns: ProjectTaskColumn[]
  ): Promise<ProjectTaskColumn[]> {
    return columns;
  },
};
