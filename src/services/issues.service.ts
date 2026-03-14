import { supabase } from '@/integrations/supabase/client';
import { Issue, TeamMember } from '@/types';
import { projects as mockProjects, projectIssues as mockIssues } from '@/data/mockData';
import { config } from '@/config';
import { attachmentsService } from './attachments.service';
import { activitiesService } from './activities.service';

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
    dueDate: dbIssue.due_date || undefined,
    assignees,
    attachments: dbIssue.attachments || [],
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

    // Step 1: Fetch issues without FK hints to profiles
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const issueIds = data.map(i => i.id);

    // Step 2: Fetch assignees and attachments separately (no FK hints)
    const [assigneesResult, attachmentsResult] = await Promise.all([
      supabase.from('issue_assignees').select('issue_id, user_id').in('issue_id', issueIds),
      supabase.from('attachments').select('*').in('entity_id', issueIds).eq('entity_type', 'issue'),
    ]);

    // Step 3: Fetch profiles for all referenced user IDs
    const allUserIds = [...new Set([
      ...data.filter(i => i.reported_by).map(i => i.reported_by!),
      ...(assigneesResult.data || []).map(a => a.user_id),
      ...(attachmentsResult.data || []).filter(a => a.uploaded_by).map(a => a.uploaded_by!),
    ])];
    let profilesMap: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials')
        .in('id', allUserIds);
      profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    }

    // Step 4: Map everything together client-side
    return data.map(issue => {
      const issueAssigneeRows = (assigneesResult.data || []).filter(a => a.issue_id === issue.id);
      const issueAttachments = (attachmentsResult.data || []).filter(a => a.entity_id === issue.id);

      const reporterProfile = issue.reported_by ? profilesMap[issue.reported_by] : null;
      const reporter = reporterProfile ? {
        id: reporterProfile.id,
        name: reporterProfile.name,
        email: reporterProfile.email,
        role: 'member',
        avatar: reporterProfile.avatar_url || undefined,
        initials: reporterProfile.initials || 'UN',
      } as TeamMember : undefined;

      const assignees: TeamMember[] = issueAssigneeRows.map(ia => {
        const profile = profilesMap[ia.user_id];
        return {
          id: profile?.id || ia.user_id,
          name: profile?.name || 'Unknown',
          role: 'member' as const,
          avatar: profile?.avatar_url || undefined,
          initials: profile?.initials || 'UN',
          email: profile?.email || '',
        };
      });

      const attachments = issueAttachments.map((a: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(a.file_path);

        const uploaderProfile = a.uploaded_by ? profilesMap[a.uploaded_by] : null;
        return {
          id: a.id,
          filename: a.file_name,
          fileType: a.mime_type || '',
          fileSize: a.file_size || 0,
          url: publicUrl,
          uploadedAt: a.uploaded_at,
          uploadedBy: uploaderProfile ? {
            id: uploaderProfile.id,
            name: uploaderProfile.name,
            email: uploaderProfile.email,
            initials: uploaderProfile.initials || 'UN',
            role: 'member',
          } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: 'member' }
        };
      });

      return mapDbIssueToIssue({ ...issue, attachments }, assignees, reporter);
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

    // Step 1: Fetch issue without FK hints to profiles
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Step 2: Fetch assignees and attachments separately
    const [assigneesResult, attachmentsResult] = await Promise.all([
      supabase.from('issue_assignees').select('issue_id, user_id').eq('issue_id', issueId),
      supabase.from('attachments').select('*').eq('entity_id', issueId).eq('entity_type', 'issue'),
    ]);

    // Step 3: Fetch profiles for all referenced user IDs
    const allUserIds = [...new Set([
      ...(data.reported_by ? [data.reported_by] : []),
      ...(assigneesResult.data || []).map(a => a.user_id),
      ...(attachmentsResult.data || []).filter(a => a.uploaded_by).map(a => a.uploaded_by!),
    ])];
    let profilesMap: Record<string, any> = {};
    if (allUserIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url, initials')
        .in('id', allUserIds);
      profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
    }

    // Step 4: Map together
    const reporterProfile = data.reported_by ? profilesMap[data.reported_by] : null;
    const reporter = reporterProfile ? {
      id: reporterProfile.id,
      name: reporterProfile.name,
      email: reporterProfile.email,
      role: 'member',
      avatar: reporterProfile.avatar_url || undefined,
      initials: reporterProfile.initials || 'UN',
    } as TeamMember : undefined;

    const assignees: TeamMember[] = (assigneesResult.data || []).map(ia => {
      const profile = profilesMap[ia.user_id];
      return {
        id: profile?.id || ia.user_id,
        name: profile?.name || 'Unknown',
        role: 'member' as const,
        avatar: profile?.avatar_url || undefined,
        initials: profile?.initials || 'UN',
        email: profile?.email || '',
      };
    });

    const attachments = (attachmentsResult.data || []).map((a: any) => {
      const { data: { publicUrl } } = supabase.storage
        .from('project-files')
        .getPublicUrl(a.file_path);

      const uploaderProfile = a.uploaded_by ? profilesMap[a.uploaded_by] : null;
      return {
        id: a.id,
        filename: a.file_name,
        fileType: a.mime_type || '',
        fileSize: a.file_size || 0,
        url: publicUrl,
        uploadedAt: a.uploaded_at,
        uploadedBy: uploaderProfile ? {
          id: uploaderProfile.id,
          name: uploaderProfile.name,
          email: uploaderProfile.email,
          initials: uploaderProfile.initials || 'UN',
          role: 'member',
        } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: 'member' }
      };
    });

    return mapDbIssueToIssue({ ...data, attachments }, assignees, reporter);
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
        due_date: issue.dueDate || null,
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

    // Add attachments if provided
    if (issue.attachments && issue.attachments.length > 0) {
      const attachmentInserts = issue.attachments.map(att => {
        const urlParts = att.url.split('project-files/');
        const filePath = urlParts.length > 1 ? urlParts[1] : (att.id.includes('temp') ? att.url : att.url.split('/').pop() || '');

        return {
          entity_id: data.id,
          entity_type: 'issue',
          file_name: att.filename,
          file_path: filePath,
          file_size: att.fileSize,
          mime_type: att.fileType,
          project_id: projectId,
          uploaded_by: user?.id || null
        };
      });
      await supabase.from('attachments').insert(attachmentInserts);
    }

    // Log activity
    activitiesService.create({
      project_id: projectId,
      activity_type: 'issue_created',
      description: `opened issue "${data.title}"`,
      user_id: user?.id || null,
      entity_id: data.id,
      entity_type: 'issue',
    }).catch(() => { /* non-critical */ });

    return this.getById(data.id) as Promise<Issue>;
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
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

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

    // Update attachments if provided
    if (updates.attachments !== undefined) {
      // Fetch current attachments in DB for this issue
      const { data: currentDbAttachments, error: fetchErr } = await supabase
        .from('attachments')
        .select('id')
        .eq('entity_id', issueId)
        .eq('entity_type', 'issue');

      if (!fetchErr && currentDbAttachments) {
        const updatedIds = updates.attachments.map(a => a.id);
        const toDelete = currentDbAttachments.filter(dbA => !updatedIds.includes(dbA.id));

        for (const attachment of toDelete) {
          try {
            await attachmentsService.delete(attachment.id);
          } catch (err) {
            console.error('Failed to delete attachment during issue update:', err);
          }
        }
      }
    }

    return this.getById(issueId) as Promise<Issue>;
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

    const { error } = await (supabase.rpc as any)('soft_delete_issue', { issue_id: issueId });
    if (error) {
      console.error('[issuesService] soft_delete_issue failed', error);
      throw error;
    }
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
