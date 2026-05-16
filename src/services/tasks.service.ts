import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { Task } from '@/types';

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
    return apiClient.get<Task[]>(ENDPOINTS.TASKS.LIST(projectId));
  },

  /**
   * Get task by ID
   */
  async getById(taskId: string): Promise<Task | null> {
    return apiClient.get<Task>(ENDPOINTS.TASKS.BY_ID(taskId));
  },

  /**
   * Create new task
   */
  async create(projectId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return apiClient.post<Task>(ENDPOINTS.TASKS.LIST(projectId), task);
  },

  /**
   * Update existing task
   */
  async update(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    return apiClient.patch<Task>(ENDPOINTS.TASKS.BY_ID(taskId), updates);
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
