import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { Project, Task, Milestone, Issue, TeamMember } from '@/types';

export const projectsService = {
  /**
   * Get all projects for an organization
   */
  async getByOrg(orgId: string): Promise<Project[]> {
    return apiClient.get<Project[]>(ENDPOINTS.PROJECTS.LIST(orgId));
  },

  /**
   * Get all projects (no org filter — returns empty; use getByOrg for actual data)
   */
  async getAll(organizationId?: string): Promise<Project[]> {
    if (!organizationId) return [];
    return this.getByOrg(organizationId);
  },

  /**
   * Get project by ID with full details
   */
  async getById(id: string): Promise<Project | null> {
    return apiClient.get<Project>(ENDPOINTS.PROJECTS.BY_ID(id));
  },

  /**
   * Create new project
   */
  async create(
    project: {
      name: string;
      description?: string;
      stage?: string;
      type?: string;
      progress?: number;
      startDate?: string;
      targetDate?: string;
      icon?: string;
      clientName?: string;
      clientOrganization?: string;
      clientContact?: string;
      notes?: string;
      departments?: string[];
    },
    organizationId: string
  ): Promise<Project> {
    return apiClient.post<Project>(ENDPOINTS.PROJECTS.LIST(organizationId), project);
  },

  /**
   * Update existing project
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    return apiClient.patch<Project>(ENDPOINTS.PROJECTS.BY_ID(id), updates);
  },

  /**
   * Delete project
   */
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(ENDPOINTS.PROJECTS.BY_ID(id));
  },

  /**
   * Update project stage
   */
  async updateStage(id: string, stage: string): Promise<Project> {
    return apiClient.patch<Project>(ENDPOINTS.PROJECTS.STAGE(id), { stage });
  },

  /**
   * Get project team members
   */
  async getTeam(id: string): Promise<TeamMember[]> {
    return apiClient.get<TeamMember[]>(ENDPOINTS.PROJECTS.TEAM(id));
  },

  /**
   * Get project members (alias for getTeam)
   */
  async getProjectMembers(projectId: string): Promise<TeamMember[]> {
    return this.getTeam(projectId);
  },

  /**
   * Get all team members (for assignment dropdowns)
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    return apiClient.get<TeamMember[]>(ENDPOINTS.PROJECTS.TEAM(''));
  },

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<Task[]> {
    return apiClient.get<Task[]>(ENDPOINTS.TASKS.LIST(projectId));
  },

  /**
   * Get milestones for a project
   */
  async getMilestones(projectId: string): Promise<Milestone[]> {
    return apiClient.get<Milestone[]>(ENDPOINTS.MILESTONES.LIST(projectId));
  },

  /**
   * Get issues for a project
   */
  async getIssues(projectId: string): Promise<Issue[]> {
    return apiClient.get<Issue[]>(ENDPOINTS.ISSUES.LIST(projectId));
  },

  /**
   * Get modules for a project
   */
  async getModules(projectId: string): Promise<unknown[]> {
    return apiClient.get<unknown[]>(ENDPOINTS.MODULES.LIST(projectId));
  },
};
