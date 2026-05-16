import { apiClient } from '@/services/api/client';
import { ENDPOINTS } from '@/services/api/endpoints';

export interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
  teamMembers: number;
  overdueItems: number;
  inProgressTasks: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  progress: number | null;
  stage: string;
  taskCount: number;
  openIssueCount: number;
  teamCount: number;
}

export interface Activity {
  id: string;
  type?: string;
  activity_type?: string;
  description: string | null;
  entityType?: string | null;
  entity_type?: string | null;
  entityId?: string | null;
  entity_id?: string | null;
  projectId?: string | null;
  project_id?: string | null;
  createdAt?: string;
  created_at?: string;
  user?: { id: string; name: string; avatarUrl: string | null } | null;
  profiles?: unknown;
  projects?: unknown;
}

export interface Milestone {
  id: string;
  name: string;
  due_date?: string | null;
  dueDate?: string | null;
  status?: string;
  project_id?: string | null;
  projectId?: string | null;
}

const EMPTY_STATS: DashboardStats = {
  activeProjects: 0,
  totalTasks: 0,
  completedTasks: 0,
  openIssues: 0,
  teamMembers: 0,
  overdueItems: 0,
  inProgressTasks: 0,
};

export const dashboardService = {
  async getStats(orgId: string): Promise<DashboardStats> {
    try {
      const data = await apiClient.get<DashboardStats>(
        ENDPOINTS.ORGANIZATIONS.REPORTS_OVERVIEW(orgId)
      );
      return {
        activeProjects: data.activeProjects || 0,
        totalTasks: data.totalTasks || 0,
        completedTasks: data.completedTasks || 0,
        openIssues: data.openIssues || 0,
        teamMembers: data.teamMembers || 0,
        overdueItems: data.overdueItems || 0,
        inProgressTasks: data.inProgressTasks || 0,
      };
    } catch (err) {
      console.error('[dashboardService] getStats failed:', err);
      return EMPTY_STATS;
    }
  },

  async getRecentProjects(orgId: string): Promise<ProjectSummary[]> {
    try {
      const projects = await apiClient.get<ProjectSummary[]>(ENDPOINTS.PROJECTS.LIST(orgId));
      return (projects || []).slice(0, 5);
    } catch {
      return [];
    }
  },

  async getRecentActivity(orgId: string, _limit = 10): Promise<Activity[]> {
    try {
      return apiClient.get(ENDPOINTS.ORGANIZATIONS.ACTIVITIES(orgId));
    } catch {
      return [];
    }
  },

  async getUpcomingMilestones(_orgId: string, _limit = 5): Promise<Milestone[]> {
    return [];
  },

  async getProjectSummaries(orgId: string): Promise<ProjectSummary[]> {
    try {
      const projects = await apiClient.get<ProjectSummary[]>(ENDPOINTS.PROJECTS.LIST(orgId));
      return (projects || []).slice(0, 6);
    } catch {
      return [];
    }
  },
};
