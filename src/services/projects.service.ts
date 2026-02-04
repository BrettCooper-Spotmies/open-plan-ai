import { supabase } from '@/integrations/supabase/client';
import { Project, Task, Milestone, Issue, TeamMember, Activity } from '@/types';
import { projects as mockProjects, teamMembers as mockTeamMembers, projectModules as mockModules, projectIssues as mockIssues } from '@/data/mockData';
import { config } from '@/config';

// Environment flag to control data source
const USE_MOCK_DATA = config.api.useMockData;
const USE_SUPABASE = config.api.useSupabase;

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Map database task to frontend Task type
// Map database task to frontend Task type
function mapDbTaskToTask(dbTask: any, assignees: TeamMember[] = []): Task {
  // Map attachments if available
  const attachments = (dbTask.attachments || []).map((a: any) => {
    // Determine public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(a.file_path);

    return {
      id: a.id,
      filename: a.file_name,
      fileType: a.mime_type || '',
      fileSize: a.file_size || 0,
      url: publicUrl,
      uploadedAt: a.uploaded_at,
      uploadedBy: a.profiles ? {
        id: a.profiles.id,
        name: a.profiles.name,
        email: a.profiles.email,
        initials: a.profiles.initials,
        role: 'member',
      } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: 'member' }
    };
  });

  return {
    id: dbTask.id,
    title: dbTask.title,
    description: dbTask.description || '',
    status: dbTask.status,
    priority: dbTask.priority,
    module: dbTask.module_type || 'software',
    dueDate: dbTask.due_date || undefined,
    startDate: dbTask.start_date || undefined,
    assignees,
    tags: dbTask.tags || [],
    checklist: (dbTask.checklists || []).map((c: any) => ({
      id: c.id,
      text: c.text,
      completed: c.completed
    })),
    // blockedBy = tasks this task depends on (from task_dependencies where task_id = this task)
    blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
    // dependencies (Blocking To) is computed client-side from allTasks
    dependencies: [],
    attachments,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    estimatedHours: dbTask.estimated_hours ? parseFloat(dbTask.estimated_hours) : undefined,
    actualHours: dbTask.actual_hours ? parseFloat(dbTask.actual_hours) : undefined,
    milestoneId: dbTask.milestone_id || undefined,
    moduleId: dbTask.module_id || undefined,
  };
}

// Map database project to frontend Project type
function mapDbProjectToProject(dbProject: any, tasks: Task[] = [], milestones: Milestone[] = [], issues: Issue[] = []): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description || '',
    stage: dbProject.stage,
    progress: dbProject.progress || 0,
    startDate: dbProject.start_date || '',
    targetDate: dbProject.target_date || '',
    icon: dbProject.icon || '📁',
    tasks,
    milestones,
    issues,
    modules: [],
    team: [],
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  };
}

// Map database milestone to frontend Milestone type
function mapDbMilestoneToMilestone(dbMilestone: any): Milestone {
  return {
    id: dbMilestone.id,
    title: dbMilestone.name,
    date: dbMilestone.due_date || '',
    completed: dbMilestone.status === 'completed',
    completedAt: dbMilestone.status === 'completed' ? dbMilestone.updated_at : undefined,
    description: dbMilestone.description || '',
    linkedTaskIds: [],
  };
}

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
    attachments: dbIssue.attachments || [],
  };
}

export const projectsService = {
  /**
   * Get all projects
   */
  async getAll(): Promise<Project[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      return [...mockProjects];
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(p => mapDbProjectToProject(p));
  },

  /**
   * Get project by ID with full details
   */
  async getById(id: string): Promise<Project | null> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === id);
      return project ? { ...project } : null;
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!project) return null;

    // Fetch related data in parallel
    const [tasksResult, milestonesResult, issuesResult] = await Promise.all([
      this.getTasks(id),
      this.getMilestones(id),
      this.getIssues(id),
    ]);

    return mapDbProjectToProject(project, tasksResult, milestonesResult, issuesResult);
  },

  /**
   * Create new project
   */
  async create(
    project: { name: string; description?: string; stage?: string; progress?: number; startDate?: string; targetDate?: string; icon?: string },
    organizationId: string
  ): Promise<Project> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: project.name,
        description: project.description || '',
        stage: (project.stage as any) || 'concept',
        progress: project.progress || 0,
        startDate: project.startDate || '',
        targetDate: project.targetDate || '',
        icon: project.icon || '📁',
        tasks: [],
        milestones: [],
        issues: [],
        modules: [],
        team: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockProjects.push(newProject);
      return newProject;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const stage = (project.stage || 'concept') as 'concept' | 'design' | 'development' | 'testing' | 'production';

    const { data, error } = await supabase
      .from('projects')
      .insert([{
        organization_id: organizationId,
        name: project.name,
        description: project.description || null,
        stage,
        progress: project.progress || 0,
        start_date: project.startDate || null,
        target_date: project.targetDate || null,
        // Note: icon column requires DB migration - uncomment when applied:
        // icon: project.icon || '📁',
        created_by: user?.id || null,
      }])
      .select()
      .single();

    if (error) throw error;
    return mapDbProjectToProject(data);
  },

  /**
   * Update existing project
   */
  async update(id: string, updates: Partial<Project>): Promise<Project> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
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

    const { data, error } = await supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        stage: updates.stage,
        progress: updates.progress,
        start_date: updates.startDate,
        target_date: updates.targetDate,
        // Note: icon column requires DB migration - uncomment when applied:
        // icon: updates.icon,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapDbProjectToProject(data);
  },

  /**
   * Delete project (soft delete)
   */
  async delete(id: string): Promise<void> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const index = mockProjects.findIndex(p => p.id === id);
      if (index !== -1) {
        mockProjects.splice(index, 1);
      }
      return;
    }

    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get tasks for a project
   */
  async getTasks(projectId: string): Promise<Task[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      return project?.tasks ? [...project.tasks] : [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees(
          user_id,
          profile:profiles!task_assignees_user_id_fkey(id, name, email, avatar_url, initials)
        ),
        checklists(*),
        task_dependencies!task_dependencies_task_id_fkey(depends_on_id),
        blocked_by:task_dependencies!task_dependencies_depends_on_id_fkey(task_id)
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch attachments for these tasks
    const taskIds = (data || []).map(t => t.id);
    const { data: attachmentsData } = await supabase
      .from('attachments')
      .select('*, profiles:profiles(id, name, email, initials)')
      .in('entity_id', taskIds)
      .eq('entity_type', 'task');

    return (data || []).map(task => {
      const taskAttachments = (attachmentsData || []).filter(a => a.entity_id === task.id);
      const taskWithAttachments = { ...task, attachments: taskAttachments };

      const assignees: TeamMember[] = (task.task_assignees || []).map((ta: any) => ({
        id: ta.profile?.id || ta.user_id,
        name: ta.profile?.name || 'Unknown',
        role: 'member',
        avatar: ta.profile?.avatar_url || undefined,
        initials: ta.profile?.initials || 'UN',
        email: ta.profile?.email || '',
      }));
      return mapDbTaskToTask(taskWithAttachments, assignees);
    });
  },

  /**
   * Get milestones for a project
   */
  async getMilestones(projectId: string): Promise<Milestone[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      return project?.milestones ? [...project.milestones] : [];
    }

    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapDbMilestoneToMilestone);
  },

  /**
   * Get issues for a project
   */
  async getIssues(projectId: string): Promise<Issue[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      const projectIssues = project?.issues || [];
      const standaloneIssues = mockIssues.filter(i => i.projectId === projectId);
      return [...projectIssues, ...standaloneIssues];
    }

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        reporter:profiles!issues_reported_by_fkey(id, name, email, avatar_url, initials),
        issue_assignees(
          user_id,
          profile:profiles!issue_assignees_user_id_fkey(id, name, email, avatar_url, initials)
        )
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch attachments for these issues in one query
    const issueIds = (data || []).map(i => i.id);
    const { data: attachmentsData } = await supabase
      .from('attachments')
      .select('*, profiles:profiles(id, name, email, initials)')
      .in('entity_id', issueIds)
      .eq('entity_type', 'issue');

    return (data || []).map(issue => {
      const issueAttachments = (attachmentsData || []).filter(a => a.entity_id === issue.id);
      const reporter = issue.reporter ? {
        id: issue.reporter.id,
        name: issue.reporter.name,
        email: issue.reporter.email,
        role: 'member',
        avatar: issue.reporter.avatar_url || undefined,
        initials: issue.reporter.initials,
      } : undefined;

      const assignees: TeamMember[] = (issue.issue_assignees || []).map((ia: any) => ({
        id: ia.profile?.id || ia.user_id,
        name: ia.profile?.name || 'Unknown',
        role: 'member',
        avatar: ia.profile?.avatar_url || undefined,
        initials: ia.profile?.initials || 'UN',
        email: ia.profile?.email || '',
      }));

      const attachments = (issueAttachments || []).map((a: any) => {
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(a.file_path);

        return {
          id: a.id,
          filename: a.file_name,
          fileType: a.mime_type || '',
          fileSize: a.file_size || 0,
          url: publicUrl,
          uploadedAt: a.uploaded_at,
          uploadedBy: a.profiles ? {
            id: a.profiles.id,
            name: a.profiles.name,
            email: a.profiles.email,
            initials: a.profiles.initials,
            role: 'member',
          } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: 'member' }
        };
      });

      return mapDbIssueToIssue({ ...issue, attachments }, assignees, reporter);
    });
  },

  /**
   * Get team members
   */
  async getTeamMembers() {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      return [...mockTeamMembers];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, initials')
      .is('deleted_at', null);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      role: 'member' as const,
      avatar: p.avatar_url || undefined,
      initials: p.initials,
      email: p.email,
    }));
  },

  /**
   * Get modules
   */
  async getModules() {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      return [...mockModules];
    }

    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .is('deleted_at', null);

    if (error) throw error;
    return data || [];
  },
};
