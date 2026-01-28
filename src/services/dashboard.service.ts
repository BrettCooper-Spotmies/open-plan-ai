import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Activity = Tables<'activities'>;
export type Milestone = Tables<'milestones'>;

export interface DashboardStats {
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
  teamMembers: number;
  overdueItems: number;
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

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get organization ID
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!memberships?.length) {
      return {
        activeProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        openIssues: 0,
        teamMembers: 0,
        overdueItems: 0,
      };
    }

    const orgId = memberships[0].organization_id;

    // Run all queries in parallel
    const [
      projectsResult,
      tasksResult,
      completedTasksResult,
      issuesResult,
      teamResult,
      overdueResult,
    ] = await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .is('deleted_at', null),
      supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'investigating'])
        .is('deleted_at', null),
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', new Date().toISOString().split('T')[0])
        .neq('status', 'done')
        .is('deleted_at', null),
    ]);

    return {
      activeProjects: projectsResult.count || 0,
      totalTasks: tasksResult.count || 0,
      completedTasks: completedTasksResult.count || 0,
      openIssues: issuesResult.count || 0,
      teamMembers: teamResult.count || 0,
      overdueItems: overdueResult.count || 0,
    };
  },

  async getRecentActivity(limit: number = 10): Promise<Activity[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getUpcomingMilestones(limit: number = 5): Promise<Milestone[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .is('deleted_at', null)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getProjectSummaries(): Promise<ProjectSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get organization ID
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .limit(1);

    if (!memberships?.length) return [];

    const orgId = memberships[0].organization_id;

    // Get projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, progress, stage')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    if (!projects) return [];

    // Get counts for each project
    const summaries: ProjectSummary[] = [];
    for (const project of projects) {
      const [taskCount, issueCount, teamCount] = await Promise.all([
        supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .is('deleted_at', null),
        supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id)
          .in('status', ['open', 'investigating'])
          .is('deleted_at', null),
        supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id),
      ]);

      summaries.push({
        ...project,
        taskCount: taskCount.count || 0,
        openIssueCount: issueCount.count || 0,
        teamCount: teamCount.count || 0,
      });
    }

    return summaries;
  },
};
