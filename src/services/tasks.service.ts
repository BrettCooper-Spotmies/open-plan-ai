import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { Task } from '@/types';

/** Map legacy underscore status values to the canonical hyphenated DB values. */
function normalizeStatus(status: string | undefined): string {
  const map: Record<string, string> = {
    in_progress:  'in-progress',
    in_review:    'review',
    in_progress_: 'in-progress',
  };
  return map[status ?? ''] ?? status ?? 'todo';
}

/**
 * Normalize a raw API task response so that `moduleIds` is always populated
 * from the `modules` array the backend returns.
 */
function fromApi(raw: any): Task {
  const apiModules: { id: string }[] = raw.modules || [];
  const moduleIds: string[] =
    raw.moduleIds?.length > 0
      ? raw.moduleIds
      : apiModules.map((m) => m.id);

  return {
    ...raw,
    moduleIds,
    // Normalise blockedBy — the API may return it as dependsOn/blockedBy arrays of objects
    blockedBy: (raw.blockedBy || []).map((d: any) => (typeof d === 'string' ? d : d.id)),
  };
}

/** Build a clean payload that satisfies the backend createTaskSchema. */
function toCreatePayload(task: Partial<Task>): Record<string, unknown> {
  return {
    title: task.title?.trim() || '',
    description: task.description || undefined,  // convert null/'' to undefined
    status: normalizeStatus(task.status),
    priority: task.priority ?? 'medium',
    milestoneId: task.milestoneId ?? task.milestone?.id ?? undefined,
    dueDate: task.dueDate ?? undefined,
    startDate: task.startDate ?? undefined,
    tags: task.tags ?? [],
    assigneeIds: (task.assignees ?? []).map((a: any) => a.id ?? a).filter(Boolean),
    moduleIds: task.moduleIds ?? [],
    dependsOnIds: task.blockedBy ?? [],
  };
}

export const tasksService = {
  /**
   * Get all tasks — returns empty array; use getByProject for actual data.
   */
  async getAll(): Promise<Task[]> {
    return [];
  },

  /**
   * Get tasks for a specific project
   */
  async getByProject(projectId: string): Promise<Task[]> {
    const data = await apiClient.get<any[]>(ENDPOINTS.TASKS.LIST(projectId));
    return (data || []).map(fromApi);
  },

  /**
   * Get task by ID
   */
  async getById(taskId: string): Promise<Task | null> {
    const data = await apiClient.get<any>(ENDPOINTS.TASKS.BY_ID(taskId));
    return data ? fromApi(data) : null;
  },

  /**
   * Create new task
   */
  async create(projectId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const data = await apiClient.post<any>(ENDPOINTS.TASKS.LIST(projectId), toCreatePayload(task));
    return fromApi(data);
  },

  /**
   * Update existing task
   */
  async update(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const data = await apiClient.patch<any>(ENDPOINTS.TASKS.BY_ID(taskId), updates);
    return fromApi(data);
  },

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: Task['status']): Promise<Task> {
    return apiClient.patch<Task>(ENDPOINTS.TASKS.STATUS(taskId), { status });
  },

  /**
   * Delete task
   */
  async delete(projectId: string, taskId: string): Promise<void> {
    return apiClient.delete<void>(ENDPOINTS.TASKS.BY_ID(taskId));
  },

  /**
   * Add assignee to task
   */
  async addAssignee(taskId: string, userId: string): Promise<void> {
    return apiClient.post<void>(ENDPOINTS.TASKS.ASSIGNEES(taskId), { userId });
  },

  /**
   * Remove assignee from task
   */
  async removeAssignee(taskId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(ENDPOINTS.TASKS.ASSIGNEE(taskId, userId));
  },

  /**
   * Batch update tasks (e.g., for drag-and-drop reordering)
   */
  async batchUpdate(projectId: string, updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]> {
    const results = await Promise.all(
      updates.map(({ id, updates: taskUpdates }) => this.update(projectId, id, taskUpdates))
    );
    return results;
  },
};
