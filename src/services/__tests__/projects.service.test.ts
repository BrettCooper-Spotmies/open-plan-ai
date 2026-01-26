import { describe, it, expect, beforeEach, vi } from 'vitest';
import { projectsService } from '../projects.service';
import { projects as mockProjects } from '@/data/mockData';
import { Project } from '@/types';

// Mock the config to ensure we're using mock data
vi.mock('@/config', () => ({
  config: { api: { useMockData: true } }
}));

describe('projectsService', () => {
  describe('getAll', () => {
    it('should return an array of projects', async () => {
      const projects = await projectsService.getAll();
      
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });

    it('should return projects with required properties', async () => {
      const projects = await projectsService.getAll();
      const project = projects[0];
      
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('stage');
      expect(project).toHaveProperty('progress');
      expect(project).toHaveProperty('tasks');
      expect(project).toHaveProperty('milestones');
    });

    it('should return a copy of projects, not the original', async () => {
      const projects1 = await projectsService.getAll();
      const projects2 = await projectsService.getAll();
      
      expect(projects1).not.toBe(projects2);
    });
  });

  describe('getById', () => {
    it('should return a project when given a valid ID', async () => {
      const projects = await projectsService.getAll();
      const validId = projects[0]?.id;
      
      if (validId) {
        const project = await projectsService.getById(validId);
        
        expect(project).not.toBeNull();
        expect(project?.id).toBe(validId);
      }
    });

    it('should return null when given an invalid ID', async () => {
      const project = await projectsService.getById('non-existent-id');
      
      expect(project).toBeNull();
    });

    it('should return a copy, not the original project', async () => {
      const projects = await projectsService.getAll();
      const validId = projects[0]?.id;
      
      if (validId) {
        const project1 = await projectsService.getById(validId);
        const project2 = await projectsService.getById(validId);
        
        expect(project1).not.toBe(project2);
      }
    });
  });

  describe('create', () => {
    it('should create a new project with generated ID and timestamps', async () => {
      const newProjectData = {
        name: 'Test Project',
        description: 'Test description',
        stage: 'concept' as const,
        progress: 0,
        startDate: '2024-01-01',
        targetDate: '2024-12-31',
        team: [],
        tasks: [],
        milestones: [],
        modules: [],
      };

      const createdProject = await projectsService.create(newProjectData);
      
      expect(createdProject).toHaveProperty('id');
      expect(createdProject.id).toMatch(/^proj-/);
      expect(createdProject).toHaveProperty('createdAt');
      expect(createdProject).toHaveProperty('updatedAt');
      expect(createdProject.name).toBe(newProjectData.name);
      expect(createdProject.description).toBe(newProjectData.description);
    });

    it('should add the project to the list', async () => {
      const initialProjects = await projectsService.getAll();
      const initialCount = initialProjects.length;

      const newProject = await projectsService.create({
        name: 'Another Test Project',
        description: 'Another test',
        stage: 'design' as const,
        progress: 10,
        startDate: '2024-02-01',
        targetDate: '2024-11-30',
        team: [],
        tasks: [],
        milestones: [],
        modules: [],
      });

      const updatedProjects = await projectsService.getAll();
      
      expect(updatedProjects.length).toBe(initialCount + 1);
      expect(updatedProjects.find(p => p.id === newProject.id)).toBeDefined();
    });
  });

  describe('update', () => {
    it('should update an existing project', async () => {
      const projects = await projectsService.getAll();
      const projectToUpdate = projects[0];
      
      if (projectToUpdate) {
        const updates = { name: 'Updated Project Name', progress: 50 };
        const updatedProject = await projectsService.update(projectToUpdate.id, updates);
        
        expect(updatedProject.name).toBe('Updated Project Name');
        expect(updatedProject.progress).toBe(50);
        expect(updatedProject.updatedAt).toBeDefined();
      }
    });

    it('should throw error when updating non-existent project', async () => {
      await expect(
        projectsService.update('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('Project not found');
    });

    it('should preserve existing properties when partially updating', async () => {
      const projects = await projectsService.getAll();
      const projectToUpdate = projects[0];
      
      if (projectToUpdate) {
        const originalDescription = projectToUpdate.description;
        const updates = { name: 'Partially Updated' };
        const updatedProject = await projectsService.update(projectToUpdate.id, updates);
        
        expect(updatedProject.name).toBe('Partially Updated');
        expect(updatedProject.description).toBe(originalDescription);
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing project', async () => {
      // Create a project to delete
      const newProject = await projectsService.create({
        name: 'Project to Delete',
        description: 'Will be deleted',
        stage: 'concept' as const,
        progress: 0,
        startDate: '2024-01-01',
        targetDate: '2024-12-31',
        team: [],
        tasks: [],
        milestones: [],
        modules: [],
      });

      const projectsBeforeDelete = await projectsService.getAll();
      expect(projectsBeforeDelete.find(p => p.id === newProject.id)).toBeDefined();

      await projectsService.delete(newProject.id);

      const projectsAfterDelete = await projectsService.getAll();
      expect(projectsAfterDelete.find(p => p.id === newProject.id)).toBeUndefined();
    });

    it('should not throw when deleting non-existent project', async () => {
      await expect(
        projectsService.delete('non-existent-id')
      ).resolves.not.toThrow();
    });
  });

  describe('getTasks', () => {
    it('should return tasks for a valid project', async () => {
      const projects = await projectsService.getAll();
      const projectWithTasks = projects.find(p => p.tasks.length > 0);
      
      if (projectWithTasks) {
        const tasks = await projectsService.getTasks(projectWithTasks.id);
        
        expect(Array.isArray(tasks)).toBe(true);
        expect(tasks.length).toBe(projectWithTasks.tasks.length);
      }
    });

    it('should return empty array for project with no tasks', async () => {
      // Create a project with no tasks
      const emptyProject = await projectsService.create({
        name: 'Empty Project',
        description: 'No tasks',
        stage: 'concept' as const,
        progress: 0,
        startDate: '2024-01-01',
        targetDate: '2024-12-31',
        team: [],
        tasks: [],
        milestones: [],
        modules: [],
      });

      const tasks = await projectsService.getTasks(emptyProject.id);
      
      expect(tasks).toEqual([]);
    });

    it('should return empty array for non-existent project', async () => {
      const tasks = await projectsService.getTasks('non-existent-id');
      
      expect(tasks).toEqual([]);
    });
  });

  describe('getMilestones', () => {
    it('should return milestones for a valid project', async () => {
      const projects = await projectsService.getAll();
      const projectWithMilestones = projects.find(p => p.milestones.length > 0);
      
      if (projectWithMilestones) {
        const milestones = await projectsService.getMilestones(projectWithMilestones.id);
        
        expect(Array.isArray(milestones)).toBe(true);
        expect(milestones.length).toBe(projectWithMilestones.milestones.length);
      }
    });

    it('should return empty array for non-existent project', async () => {
      const milestones = await projectsService.getMilestones('non-existent-id');
      
      expect(milestones).toEqual([]);
    });
  });

  describe('getIssues', () => {
    it('should return issues for a project', async () => {
      const projects = await projectsService.getAll();
      const validProjectId = projects[0]?.id;
      
      if (validProjectId) {
        const issues = await projectsService.getIssues(validProjectId);
        
        expect(Array.isArray(issues)).toBe(true);
      }
    });

    it('should return empty array or combined issues', async () => {
      const projects = await projectsService.getAll();
      const validProjectId = projects[0]?.id;
      
      if (validProjectId) {
        const issues = await projectsService.getIssues(validProjectId);
        
        expect(Array.isArray(issues)).toBe(true);
        // Issues array may be empty or have items, both are valid
      }
    });
  });

  describe('getTeamMembers', () => {
    it('should return an array of team members', async () => {
      const teamMembers = await projectsService.getTeamMembers() as { id: string; name: string; email: string; role: string }[];
      
      expect(Array.isArray(teamMembers)).toBe(true);
      expect(teamMembers.length).toBeGreaterThan(0);
    });

    it('should return team members with required properties', async () => {
      const teamMembers = await projectsService.getTeamMembers() as { id: string; name: string; email: string; role: string }[];
      const member = teamMembers[0];
      
      expect(member).toHaveProperty('id');
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('role');
    });
  });

  describe('getModules', () => {
    it('should return an array of modules', async () => {
      const modules = await projectsService.getModules() as { id: string; name: string; type: string }[];
      
      expect(Array.isArray(modules)).toBe(true);
    });

    it('should return modules with required properties', async () => {
      const modules = await projectsService.getModules() as { id: string; name: string; type: string }[];
      
      if (modules.length > 0) {
        const module = modules[0];
        
        expect(module).toHaveProperty('id');
        expect(module).toHaveProperty('name');
        expect(module).toHaveProperty('type');
      }
    });
  });
});
