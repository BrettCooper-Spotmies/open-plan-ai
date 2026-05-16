import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  projectId: string | null;
  orgId: string | null;
  metadata: unknown;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null } | null;
}

export type ActivityInsert = Omit<Activity, 'id' | 'createdAt' | 'user'>;

export const activitiesService = {
  async getAll(): Promise<Activity[]> {
    return [];
  },

  async getByProjectId(projectId: string): Promise<Activity[]> {
    return apiClient.get(ENDPOINTS.PROJECTS.ACTIVITIES(projectId));
  },

  async getRecent(_limit = 10): Promise<Activity[]> {
    return [];
  },

  async create(_activity: ActivityInsert): Promise<Activity> {
    throw new Error('Activities are created server-side');
  },

  async getByEntityId(_entityId: string, _entityType: string): Promise<Activity[]> {
    return [];
  },
};
