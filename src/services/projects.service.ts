import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';
import { Project, Task, Milestone, Issue, IssueCategory, IssueSeverity, IssueStatus, TeamMember } from '@/types';

function fromApiIssue(raw: Record<string, unknown>): Issue {
  const assignees = ((raw.assignees as any[]) || []).map((a: any): TeamMember => ({
    id: a.id,
    name: a.name ?? '',
    email: '',
    role: 'Member' as const,
    initials: a.name ? (a.name as string).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '?',
    avatar: a.avatarUrl ?? '',
    avatarUrl: a.avatarUrl ?? null,
  }));

  return {
    id: raw.id as string,
    title: raw.title as string,
    description: (raw.description as string) ?? '',
    projectId: (raw.projectId ?? raw.project_id) as string,
    moduleId: (raw.moduleId as string) || undefined,
    category: raw.category as IssueCategory,
    severity: (raw.severity as IssueSeverity) ?? 'minor',
    status: (raw.status as IssueStatus) ?? 'open',
    reportedAt: (raw.createdAt as string) ?? new Date().toISOString(),
    resolvedAt: (raw.resolvedAt as string) || undefined,
    dueDate: (raw.dueDate as string) || undefined,
    resolution: (raw.resolution as string) || undefined,
    reportedBy: (raw.reportedBy as TeamMember) ?? { id: '', name: 'Unknown', email: '', role: 'Member', initials: 'U', avatar: '' },
    assignees,
    blocksTaskIds: [],
  } as Issue;
}

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
    return apiClient.put<Project>(ENDPOINTS.PROJECTS.BY_ID(id), updates);
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
  async getTasks(projectId: string, limit = 100): Promise<Task[]> {
    return apiClient.get<Task[]>(`${ENDPOINTS.TASKS.LIST(projectId)}?limit=${limit}`);
  },

  /**
   * Get milestones for a project
   */
  async getMilestones(projectId: string, limit = 100): Promise<Milestone[]> {
    return apiClient.get<Milestone[]>(`${ENDPOINTS.MILESTONES.LIST(projectId)}?limit=${limit}`);
  },

  /**
   * Get issues for a project
   */
  async getIssues(projectId: string, limit = 100): Promise<Issue[]> {
    const data = await apiClient.get<Record<string, unknown>[]>(`${ENDPOINTS.ISSUES.LIST(projectId)}?limit=${limit}`);
    return (data || []).map(fromApiIssue);
  },

  /**
   * Get modules for a project
   */
  async getModules(projectId: string): Promise<unknown[]> {
    return apiClient.get<unknown[]>(ENDPOINTS.MODULES.LIST(projectId));
  },
};
