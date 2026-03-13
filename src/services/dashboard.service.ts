import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';

export type Activity = Tables<'activities'>;
export type Milestone = Tables<'milestones'>;

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

export const dashboardService = {
  async getStats(orgId: string): Promise<DashboardStats> {
    // Get project IDs for this org
    const { data: orgProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    const projectIds = (orgProjects || []).map(p => p.id);

    if (projectIds.length === 0) {
      return {
        activeProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        openIssues: 0,
        teamMembers: 0,
        overdueItems: 0,
        inProgressTasks: 0,
      };
    }

    // Run all queries in parallel
    const [
      tasksResult,
      completedTasksResult,
      issuesResult,
      teamResult,
      overdueResult,
      inProgressResult,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'done')
        .is('deleted_at', null),
      supabase
        .from('issues')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .in('status', ['open', 'investigating'])
        .is('deleted_at', null),
      supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .lt('due_date', format(new Date(), 'yyyy-MM-dd'))
        .neq('status', 'done')
        .is('deleted_at', null),
      supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('status', 'in-progress')
        .is('deleted_at', null),
    ]);

    return {
      activeProjects: projectIds.length,
      totalTasks: tasksResult.count || 0,
      completedTasks: completedTasksResult.count || 0,
      openIssues: issuesResult.count || 0,
      teamMembers: teamResult.count || 0,
      overdueItems: overdueResult.count || 0,
      inProgressTasks: inProgressResult.count || 0,
    };
  },

  async getRecentActivity(orgId: string, limit: number = 10): Promise<Activity[]> {
    // Get project IDs for this org
    const { data: orgProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    const projectIds = (orgProjects || []).map(p => p.id);
    if (projectIds.length === 0) return [];

    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        profiles:user_id ( id, name, email, initials, avatar_url ),
        projects:project_id ( id, name )
      `)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as any;
  },

  async getUpcomingMilestones(orgId: string, limit: number = 5): Promise<Milestone[]> {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get project IDs for this org
    const { data: orgProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', orgId)
      .is('deleted_at', null);

    const projectIds = (orgProjects || []).map(p => p.id);
    if (projectIds.length === 0) return [];

    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .in('project_id', projectIds)
      .is('deleted_at', null)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getProjectSummaries(orgId: string): Promise<ProjectSummary[]> {
    // Get projects for this org
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
