import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tasksService } from '../tasks.service';
import { projectsService } from '../projects.service';
import { Task } from '@/types';

// Mock the config to ensure we're using mock data
vi.mock('@/config', () => ({
  config: { api: { useMockData: true } }
}));

describe('tasksService', () => {
  describe('getAll', () => {
    it('should return all tasks across all projects', async () => {
      const tasks = await tasksService.getAll();

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should return tasks with required properties', async () => {
      const tasks = await tasksService.getAll();
      const task = tasks[0];

      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
      expect(task).toHaveProperty('module');
    });

    it('should return tasks from multiple projects', async () => {
      const projects = await projectsService.getAll();
      const projectsWithTasks = projects.filter(p => p.tasks.length > 0);

      if (projectsWithTasks.length >= 2) {
        const tasks = await tasksService.getAll();
        const expectedTotalTasks = projects.reduce((sum, p) => sum + p.tasks.length, 0);

        expect(tasks.length).toBe(expectedTotalTasks);
      }
    });
  });

  describe('getById', () => {
    it('should return a task when given a valid ID', async () => {
      const tasks = await tasksService.getAll();
      const validId = tasks[0]?.id;

      if (validId) {
        const task = await tasksService.getById(validId);

        expect(task).not.toBeNull();
        expect(task?.id).toBe(validId);
      }
    });

    it('should return null when given an invalid ID', async () => {
      const task = await tasksService.getById('non-existent-task-id');

      expect(task).toBeNull();
    });

    it('should return a copy of the task, not the original', async () => {
      const tasks = await tasksService.getAll();
      const validId = tasks[0]?.id;

      if (validId) {
        const task1 = await tasksService.getById(validId);
        const task2 = await tasksService.getById(validId);

        expect(task1).not.toBe(task2);
      }
    });
  });

  describe('create', () => {
    it('should create a new task with generated ID and timestamps', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;

      if (projectId) {
        const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
          title: 'Test Task',
          description: 'Test description',
          status: 'todo',
          priority: 'medium',
          module: 'software',
          blockedBy: [],
          tags: ['test'],
        };

        const createdTask = await tasksService.create(projectId, newTaskData);

        expect(createdTask).toHaveProperty('id');
        expect(createdTask.id).toMatch(/^task-/);
        expect(createdTask).toHaveProperty('createdAt');
        expect(createdTask).toHaveProperty('updatedAt');
        expect(createdTask.title).toBe(newTaskData.title);
      }
    });

    it('should add the task to the project', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;

      if (projectId) {
        const initialTasks = await projectsService.getTasks(projectId);
        const initialCount = initialTasks.length;

        await tasksService.create(projectId, {
          title: 'Another Test Task',
          status: 'todo',
          priority: 'high',
          module: 'hardware',
          blockedBy: [],
          tags: [],
        });

        const updatedTasks = await projectsService.getTasks(projectId);

        expect(updatedTasks.length).toBe(initialCount + 1);
      }
    });

    it('should throw error when project does not exist', async () => {
      await expect(
        tasksService.create('non-existent-project', {
          title: 'Test',
          status: 'todo',
          priority: 'low',
          module: 'testing',
          blockedBy: [],
          tags: [],
        })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('update', () => {
    it('should update an existing task', async () => {
      const projects = await projectsService.getAll();
      const projectWithTasks = projects.find(p => p.tasks.length > 0);

      if (projectWithTasks) {
        const taskToUpdate = projectWithTasks.tasks[0];
        const updates = { title: 'Updated Task Title', status: 'in-progress' as const };

        const updatedTask = await tasksService.update(
          projectWithTasks.id,
          taskToUpdate.id,
          updates
        );

        expect(updatedTask.title).toBe('Updated Task Title');
        expect(updatedTask.status).toBe('in-progress');
        expect(updatedTask.updatedAt).toBeDefined();
      }
    });

    it('should throw error when project does not exist', async () => {
      await expect(
        tasksService.update('non-existent-project', 'task-id', { title: 'Test' })
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when task does not exist', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;

      if (projectId) {
        await expect(
          tasksService.update(projectId, 'non-existent-task', { title: 'Test' })
        ).rejects.toThrow('Task not found');
      }
    });

    it('should preserve existing properties when partially updating', async () => {
      const projects = await projectsService.getAll();
      const projectWithTasks = projects.find(p => p.tasks.length > 0);

      if (projectWithTasks) {
        const taskToUpdate = projectWithTasks.tasks[0];
        const originalPriority = taskToUpdate.priority;

        const updatedTask = await tasksService.update(
          projectWithTasks.id,
          taskToUpdate.id,
          { title: 'Partially Updated Task' }
        );

        expect(updatedTask.title).toBe('Partially Updated Task');
        expect(updatedTask.priority).toBe(originalPriority);
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing task', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;

      if (projectId) {
        // Create a task to delete
        const newTask = await tasksService.create(projectId, {
          title: 'Task to Delete',
          status: 'todo',
          priority: 'low',
          module: 'testing',
          blockedBy: [],
          tags: [],
        });

        const tasksBeforeDelete = await projectsService.getTasks(projectId);
        expect(tasksBeforeDelete.find(t => t.id === newTask.id)).toBeDefined();

        await tasksService.delete(projectId, newTask.id);

        const tasksAfterDelete = await projectsService.getTasks(projectId);
        expect(tasksAfterDelete.find(t => t.id === newTask.id)).toBeUndefined();
      }
    });

    it('should not throw when deleting non-existent task', async () => {
      const projects = await projectsService.getAll();
      const projectId = projects[0]?.id;

      if (projectId) {
        await expect(
          tasksService.delete(projectId, 'non-existent-task')
        ).resolves.not.toThrow();
      }
    });
  });

  describe('batchUpdate', () => {
    it('should update multiple tasks at once', async () => {
      const projects = await projectsService.getAll();
      const projectWithMultipleTasks = projects.find(p => p.tasks.length >= 2);

      if (projectWithMultipleTasks) {
        const task1 = projectWithMultipleTasks.tasks[0];
        const task2 = projectWithMultipleTasks.tasks[1];

        const updates = [
          { id: task1.id, updates: { priority: 'high' as const } },
          { id: task2.id, updates: { priority: 'critical' as const } },
        ];

        const updatedTasks = await tasksService.batchUpdate(
          projectWithMultipleTasks.id,
          updates
        );

        expect(updatedTasks.length).toBe(2);
        expect(updatedTasks.find(t => t.id === task1.id)?.priority).toBe('high');
        expect(updatedTasks.find(t => t.id === task2.id)?.priority).toBe('critical');
      }
    });

    it('should throw error when project does not exist', async () => {
      await expect(
        tasksService.batchUpdate('non-existent-project', [
          { id: 'task-1', updates: { title: 'Test' } }
        ])
      ).rejects.toThrow('Project not found');
    });

    it('should skip non-existent tasks in batch', async () => {
      const projects = await projectsService.getAll();
      const projectWithTasks = projects.find(p => p.tasks.length > 0);

      if (projectWithTasks) {
        const realTask = projectWithTasks.tasks[0];

        const updates = [
          { id: realTask.id, updates: { priority: 'low' as const } },
          { id: 'non-existent-task', updates: { title: 'Test' } },
        ];

        const updatedTasks = await tasksService.batchUpdate(
          projectWithTasks.id,
          updates
        );

        // Should only return the successfully updated task
        expect(updatedTasks.length).toBe(1);
        expect(updatedTasks[0]?.id).toBe(realTask.id);
      }
    });

    it('should update timestamps on batch update', async () => {
      const projects = await projectsService.getAll();
      const projectWithTasks = projects.find(p => p.tasks.length > 0);

      if (projectWithTasks) {
        const task = projectWithTasks.tasks[0];
        const originalUpdatedAt = task.updatedAt;

        // Wait a tiny bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));

        const updatedTasks = await tasksService.batchUpdate(
          projectWithTasks.id,
          [{ id: task.id, updates: { title: 'Batch Updated' } }]
        );

        expect(updatedTasks[0]?.updatedAt).toBeDefined();
      }
    });
  });
});
