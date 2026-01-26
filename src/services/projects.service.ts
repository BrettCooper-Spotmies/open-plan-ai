import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Project, Task, Milestone, Issue } from '@/types';
import { projects as mockProjects, teamMembers as mockTeamMembers, projectModules as mockModules, projectIssues as mockIssues } from '@/data/mockData';

// Environment flag to control data source
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const projectsService = {
  /**
   * Get all projects
   */
  async getAll(): Promise<Project[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockProjects];
    }
    return apiClient.get<Project[]>(API_ENDPOINTS.PROJECTS);
  },

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === id);
      return project ? { ...project } : null;
    }
    return apiClient.get<Project>(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  /**
   * Create new project
   */
  async create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const newProject: Project = {
        ...project,
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProjects.push(newProject);
      return newProject;
    }
    return apiClient.post<Project>(API_ENDPOINTS.PROJECTS, project);
  },

  /**
   * Update existing project
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockProjects.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Project not found');
      
      mockProjects[index] = {
        ...mockProjects[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...mockProjects[index] };
    }
    return apiClient.patch<Project>(API_ENDPOINTS.PROJECT_BY_ID(id), updates);
  },

  /**
   * Delete project
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const index = mockProjects.findIndex(p => p.id === id);
      if (index !== -1) {
        mockProjects.splice(index, 1);
      }
      return;
    }
    return apiClient.delete(API_ENDPOINTS.PROJECT_BY_ID(id));
  },

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<Task[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      return project?.tasks ? [...project.tasks] : [];
    }
    return apiClient.get<Task[]>(API_ENDPOINTS.PROJECT_TASKS(projectId));
  },

  /**
   * Get milestones for a project
   */
  async getMilestones(projectId: string): Promise<Milestone[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      return project?.milestones ? [...project.milestones] : [];
    }
    return apiClient.get<Milestone[]>(API_ENDPOINTS.PROJECT_MILESTONES(projectId));
  },

  /**
   * Get issues for a project
   */
  async getIssues(projectId: string): Promise<Issue[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      // Combine project issues with standalone issues matching projectId
      const projectIssues = project?.issues || [];
      const standaloneIssues = mockIssues.filter(i => i.projectId === projectId);
      return [...projectIssues, ...standaloneIssues];
    }
    return apiClient.get<Issue[]>(API_ENDPOINTS.PROJECT_ISSUES(projectId));
  },

  /**
   * Get team members
   */
  async getTeamMembers() {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockTeamMembers];
    }
    return apiClient.get(API_ENDPOINTS.TEAM_MEMBERS);
  },

  /**
   * Get modules
   */
  async getModules() {
    if (USE_MOCK_DATA) {
      await mockDelay();
      return [...mockModules];
    }
    return apiClient.get(API_ENDPOINTS.MODULES);
  },
};
