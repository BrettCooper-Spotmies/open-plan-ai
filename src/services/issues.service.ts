import { apiClient } from './api/client';
import { API_ENDPOINTS } from './api/endpoints';
import { Issue } from '@/types';
import { projects as mockProjects, projectIssues as mockIssues } from '@/data/mockData';

// Environment flag to control data source
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

export const issuesService = {
  /**
   * Get all issues across all projects
   */
  async getAll(): Promise<Issue[]> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const projectIssues = mockProjects.flatMap(p => p.issues || []);
      return [...projectIssues, ...mockIssues];
    }
    return apiClient.get<Issue[]>(API_ENDPOINTS.ISSUES);
  },

  /**
   * Get issue by ID
   */
  async getById(issueId: string): Promise<Issue | null> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      // Check project issues first
      for (const project of mockProjects) {
        const issue = project.issues?.find(i => i.id === issueId);
        if (issue) return { ...issue };
      }
      // Check standalone issues
      const standaloneIssue = mockIssues.find(i => i.id === issueId);
      return standaloneIssue ? { ...standaloneIssue } : null;
    }
    return apiClient.get<Issue>(API_ENDPOINTS.ISSUE_BY_ID(issueId));
  },

  /**
   * Create new issue
   */
  async create(projectId: string, issue: Omit<Issue, 'id' | 'reportedAt'>): Promise<Issue> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');
      
      const newIssue: Issue = {
        ...issue,
        id: `issue-${Date.now()}`,
        projectId,
        reportedAt: new Date().toISOString(),
      };
      
      if (!project.issues) {
        project.issues = [];
      }
      project.issues.push(newIssue);
      return newIssue;
    }
    return apiClient.post<Issue>(API_ENDPOINTS.PROJECT_ISSUES(projectId), issue);
  },

  /**
   * Update existing issue
   */
  async update(issueId: string, updates: Partial<Issue>): Promise<Issue> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      
      // Check project issues first
      for (const project of mockProjects) {
        if (project.issues) {
          const issueIndex = project.issues.findIndex(i => i.id === issueId);
          if (issueIndex !== -1) {
            project.issues[issueIndex] = {
              ...project.issues[issueIndex],
              ...updates,
            };
            return { ...project.issues[issueIndex] };
          }
        }
      }
      
      // Check standalone issues
      const standaloneIndex = mockIssues.findIndex(i => i.id === issueId);
      if (standaloneIndex !== -1) {
        mockIssues[standaloneIndex] = {
          ...mockIssues[standaloneIndex],
          ...updates,
        };
        return { ...mockIssues[standaloneIndex] };
      }
      
      throw new Error('Issue not found');
    }
    return apiClient.patch<Issue>(API_ENDPOINTS.ISSUE_BY_ID(issueId), updates);
  },

  /**
   * Delete issue
   */
  async delete(issueId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      
      // Check project issues first
      for (const project of mockProjects) {
        if (project.issues) {
          const index = project.issues.findIndex(i => i.id === issueId);
          if (index !== -1) {
            project.issues.splice(index, 1);
            return;
          }
        }
      }
      
      // Check standalone issues
      const standaloneIndex = mockIssues.findIndex(i => i.id === issueId);
      if (standaloneIndex !== -1) {
        mockIssues.splice(standaloneIndex, 1);
      }
      return;
    }
    return apiClient.delete(API_ENDPOINTS.ISSUE_BY_ID(issueId));
  },

  /**
   * Get open issues count
   */
  async getOpenCount(): Promise<{ total: number; critical: number }> {
    if (USE_MOCK_DATA) {
      await mockDelay();
      const allIssues = await this.getAll();
      const openIssues = allIssues.filter(i => i.status === 'open' || i.status === 'investigating');
      const criticalIssues = openIssues.filter(i => i.severity === 'critical');
      return {
        total: openIssues.length,
        critical: criticalIssues.length,
      };
    }
    return apiClient.get<{ total: number; critical: number }>(`${API_ENDPOINTS.ISSUES}/count`);
  },
};
