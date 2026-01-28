import { supabase } from '@/integrations/supabase/client';
import { Issue, TeamMember } from '@/types';
import { projects as mockProjects, projectIssues as mockIssues } from '@/data/mockData';
import { config } from '@/config';

// Environment flag to control data source
const USE_MOCK_DATA = config.api.useMockData;
const USE_SUPABASE = config.api.useSupabase;

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Map database issue to frontend Issue type
function mapDbIssueToIssue(dbIssue: any, assignees: TeamMember[] = [], reportedBy?: TeamMember): Issue {
  const defaultReporter: TeamMember = {
    id: dbIssue.reported_by || 'unknown',
    name: 'Unknown User',
    email: '',
    role: 'member',
    initials: 'UN',
  };

  return {
    id: dbIssue.id,
    projectId: dbIssue.project_id,
    title: dbIssue.title,
    description: dbIssue.description || '',
    severity: dbIssue.severity,
    status: dbIssue.status,
    category: dbIssue.category || 'other',
    reportedBy: reportedBy || defaultReporter,
    reportedAt: dbIssue.reported_at || dbIssue.created_at,
    resolvedAt: dbIssue.resolved_at || undefined,
    assignees,
  };
}

export const issuesService = {
  /**
   * Get all issues across all projects
   */
  async getAll(): Promise<Issue[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const projectIssues = mockProjects.flatMap(p => p.issues || []);
      return [...projectIssues, ...mockIssues];
    }

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        issue_assignees(
          user_id,
          profile:profiles(id, name, email, avatar_url, initials)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(issue => {
      const assignees: TeamMember[] = (issue.issue_assignees || []).map((ia: any) => ({
        id: ia.profile?.id || ia.user_id,
        name: ia.profile?.name || 'Unknown',
        role: 'member',
        avatar: ia.profile?.avatar_url || undefined,
        initials: ia.profile?.initials || 'UN',
        email: ia.profile?.email || '',
      }));
      return mapDbIssueToIssue(issue, assignees);
    });
  },

  /**
   * Get issue by ID
   */
  async getById(issueId: string): Promise<Issue | null> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
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

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        issue_assignees(
          user_id,
          profile:profiles(id, name, email, avatar_url, initials)
        )
      `)
      .eq('id', issueId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const assignees: TeamMember[] = (data.issue_assignees || []).map((ia: any) => ({
      id: ia.profile?.id || ia.user_id,
      name: ia.profile?.name || 'Unknown',
      role: 'member',
      avatar: ia.profile?.avatar_url || undefined,
      initials: ia.profile?.initials || 'UN',
      email: ia.profile?.email || '',
    }));

    return mapDbIssueToIssue(data, assignees);
  },

  /**
   * Create new issue
   */
  async create(projectId: string, issue: Omit<Issue, 'id' | 'reportedAt'>): Promise<Issue> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
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

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('issues')
      .insert({
        project_id: projectId,
        title: issue.title,
        description: issue.description || null,
        severity: issue.severity,
        status: issue.status,
        category: issue.category || 'other',
        reported_by: user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Add assignees if provided
    if (issue.assignees && issue.assignees.length > 0) {
      const assigneeInserts = issue.assignees.map(a => ({
        issue_id: data.id,
        user_id: a.id,
        assigned_by: user?.id || null,
      }));

      await supabase.from('issue_assignees').insert(assigneeInserts);
    }

    return mapDbIssueToIssue(data, issue.assignees || [], issue.reportedBy);
  },

  /**
   * Update existing issue
   */
  async update(issueId: string, updates: Partial<Issue>): Promise<Issue> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
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

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.severity !== undefined) updateData.severity = updates.severity;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.resolvedAt !== undefined) updateData.resolved_at = updates.resolvedAt;

    const { data, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', issueId)
      .select()
      .single();

    if (error) throw error;

    // Update assignees if provided
    if (updates.assignees !== undefined) {
      await supabase.from('issue_assignees').delete().eq('issue_id', issueId);
      
      if (updates.assignees.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const assigneeInserts = updates.assignees.map(a => ({
          issue_id: issueId,
          user_id: a.id,
          assigned_by: user?.id || null,
        }));
        await supabase.from('issue_assignees').insert(assigneeInserts);
      }
    }

    return mapDbIssueToIssue(data, updates.assignees || []);
  },

  /**
   * Delete issue (soft delete)
   */
  async delete(issueId: string): Promise<void> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
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

    const { error } = await supabase
      .from('issues')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', issueId);

    if (error) throw error;
  },

  /**
   * Get open issues count
   */
  async getOpenCount(): Promise<{ total: number; critical: number }> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const allIssues = await this.getAll();
      const openIssues = allIssues.filter(i => i.status === 'open' || i.status === 'investigating');
      const criticalIssues = openIssues.filter(i => i.severity === 'critical');
      return {
        total: openIssues.length,
        critical: criticalIssues.length,
      };
    }

    const { count: total, error: totalError } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating'])
      .is('deleted_at', null);

    if (totalError) throw totalError;

    const { count: critical, error: criticalError } = await supabase
      .from('issues')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'investigating'])
      .eq('severity', 'critical')
      .is('deleted_at', null);

    if (criticalError) throw criticalError;

    return {
      total: total || 0,
      critical: critical || 0,
    };
  },
};
