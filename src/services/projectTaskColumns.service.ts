export interface ProjectTaskColumn {
  id: string;
  status: string;
  label: string;
  color: string;
  isSpecial?: boolean;
}

export const DEFAULT_COLUMNS: ProjectTaskColumn[] = [
  { id: 'backlog',    status: 'backlog',    label: 'Backlog',      color: '#6b7280' },
  { id: 'todo',       status: 'todo',       label: 'To Do',        color: '#3b82f6' },
  { id: 'in_progress',status: 'in_progress',label: 'In Progress',  color: '#f59e0b' },
  { id: 'in_review',  status: 'in_review',  label: 'In Review',    color: '#8b5cf6' },
  { id: 'done',       status: 'done',       label: 'Done',         color: '#10b981', isSpecial: true },
];

function storageKey(projectId: string) {
  return `openplan_columns_${projectId}`;
}

export const projectTaskColumnsService = {
  async getByProjectId(projectId: string): Promise<ProjectTaskColumn[]> {
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectTaskColumn[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_COLUMNS;
  },

  async replaceForProject(
    projectId: string,
    columns: ProjectTaskColumn[]
  ): Promise<ProjectTaskColumn[]> {
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(columns));
    } catch {
      // ignore storage errors
    }
    return columns;
  },
};
