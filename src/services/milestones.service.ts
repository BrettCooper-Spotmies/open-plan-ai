import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

// Snake_case insert/update shapes to maintain compatibility with existing call sites.
export interface MilestoneInsert {
  project_id: string;
  name: string;
  due_date?: string | null;
  description?: string | null;
  status?: string;
}

export interface MilestoneUpdate {
  name?: string;
  due_date?: string | null;
  description?: string | null;
  status?: string;
}

// DB-shape type exported for consumers that do their own adapter mapping.
export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  due_date: string | null;
  description: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

/** Map snake_case insert payload to camelCase for the REST backend. */
function toApiPayload(data: MilestoneInsert | MilestoneUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ('name' in data && data.name !== undefined) out.title = data.name;
  if ('due_date' in data && data.due_date != null) out.dueDate = data.due_date;
  if ('description' in data && data.description != null) out.description = data.description;
  if ('status' in data && data.status != null) out.status = data.status;
  if ('project_id' in data) out.projectId = (data as MilestoneInsert).project_id;
  return out;
}

/** Map camelCase API response back to the snake_case Milestone shape. */
function fromApi(raw: Record<string, unknown>): Milestone {
  return {
    id: raw.id as string,
    project_id: (raw.projectId ?? raw.project_id) as string,
    name: (raw.title ?? raw.name) as string,
    due_date: (raw.dueDate ?? raw.due_date ?? null) as string | null,
    description: (raw.description ?? null) as string | null,
    status: (raw.status ?? (raw.completed ? 'completed' : 'pending')) as string,
    created_at: (raw.createdAt ?? raw.created_at ?? null) as string | null,
    updated_at: (raw.updatedAt ?? raw.updated_at ?? null) as string | null,
  };
}

export const milestonesService = {
  async getAll(): Promise<Milestone[]> {
    return [];
  },

  async getByProjectId(projectId: string): Promise<Milestone[]> {
    const data = await apiClient.get<Record<string, unknown>[]>(ENDPOINTS.MILESTONES.LIST(projectId));
    return (data || []).map(fromApi);
  },

  async getById(id: string): Promise<Milestone | null> {
    const data = await apiClient.get<Record<string, unknown>>(ENDPOINTS.MILESTONES.BY_ID(id));
    return data ? fromApi(data) : null;
  },

  async create(milestone: MilestoneInsert): Promise<Milestone> {
    const data = await apiClient.post<Record<string, unknown>>(
      ENDPOINTS.MILESTONES.LIST(milestone.project_id),
      toApiPayload(milestone)
    );
    return fromApi(data);
  },

  async createMany(milestones: MilestoneInsert[]): Promise<Milestone[]> {
    return Promise.all(milestones.map(m => this.create(m)));
  },

  async update(id: string, updates: MilestoneUpdate): Promise<Milestone> {
    // Backend only registers PUT for this route (no PATCH handler exists).
    const data = await apiClient.put<Record<string, unknown>>(
      ENDPOINTS.MILESTONES.BY_ID(id),
      toApiPayload(updates)
    );
    return fromApi(data);
  },

  async updateMany(updates: { id: string; name?: string; due_date?: string | null }[]): Promise<void> {
    await Promise.all(updates.map(u => this.update(u.id, { name: u.name, due_date: u.due_date })));
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(ENDPOINTS.MILESTONES.BY_ID(id));
  },

  async deleteMany(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.delete(id)));
  },

  async complete(id: string, completed: boolean): Promise<Milestone> {
    const data = await apiClient.patch<Record<string, unknown>>(ENDPOINTS.MILESTONES.COMPLETE(id), { completed });
    return fromApi(data);
  },

  async getUpcoming(orgId: string, limit: number = 5): Promise<Milestone[]> {
    const { projectsService } = await import('./projects.service');
    const projects = await projectsService.getAll(orgId);
    if (!projects.length) return [];
    const allResults = await Promise.all(projects.map(p => this.getByProjectId(p.id).catch(() => [])));
    const now = new Date().toISOString();
    return allResults
      .flat()
      .filter(m => m.due_date && m.due_date > now && m.status !== 'completed')
      .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
      .slice(0, limit);
  },
};
