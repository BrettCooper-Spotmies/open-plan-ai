import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Task } from '@/types';
import { projects as mockProjects } from '@/data/mockData';
import { config } from '@/config';

// Environment flag to control data source
const USE_MOCK_DATA = config.api.useMockData;

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const tasksService = {
  /**
   * Get all tasks across all projects
   */
  async getAll(): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return mockProjects.flatMap(p => p.tasks);
    }
    return apiClient.get<Task[]>(API_ENDPOINTS.TASKS);
  },

  /**
   * Get task by ID
   */
  async getById(taskId: string): Promise<Task | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      for (const project of mockProjects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) return { ...task };
      }
      return null;
    }
    return apiClient.get<Task>(API_ENDPOINTS.TASK_BY_ID(taskId));
  },

  /**
   * Create new task
   */
  async create(projectId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      project.tasks.push(newTask);
      return newTask;
    }
    return apiClient.post<Task>(API_ENDPOINTS.PROJECT_TASKS(projectId), task);
  },

  /**
   * Update existing task
   */
  async update(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      
      const taskIndex = project.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) throw new Error('Task not found');
      
      project.tasks[taskIndex] = {
        ...project.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...project.tasks[taskIndex] };
    }
    return apiClient.patch<Task>(API_ENDPOINTS.TASK_BY_ID(taskId), updates);
  },

  /**
   * Delete task
   */
  async delete(projectId: string, taskId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (project) {
        const index = project.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          project.tasks.splice(index, 1);
        }
      }
      return;
    }
    return apiClient.delete(API_ENDPOINTS.TASK_BY_ID(taskId));
  },

  /**
   * Batch update tasks (e.g., for drag-and-drop reordering)
   */
  async batchUpdate(projectId: string, updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      
      const updatedTasks: Task[] = [];
      for (const { id, updates: taskUpdates } of updates) {
        const taskIndex = project.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
          project.tasks[taskIndex] = {
            ...project.tasks[taskIndex],
            ...taskUpdates,
            updatedAt: new Date().toISOString(),
          };
          updatedTasks.push({ ...project.tasks[taskIndex] });
        }
      }
      return updatedTasks;
    }
    // For REST API, you might need a batch endpoint
    return apiClient.patch<Task[]>(`${API_ENDPOINTS.PROJECT_TASKS(projectId)}/batch`, { updates });
  },
};
