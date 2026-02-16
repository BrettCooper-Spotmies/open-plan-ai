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
    type: dbProject.type, // Map from DB
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
    dueDate: dbIssue.due_date || undefined,
    assignees,
    attachments: dbIssue.attachments || [],
  };
}

export const projectsService = {
  /**
   * Get all projects
   */
  async getAll(organizationId?: string): Promise<Project[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      return [...mockProjects];
    }

    let query = supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch tasks, milestones, and issues for each project
    // Use resilient fetching - if sub-queries fail, still show projects with empty data
    const projectsWithDetails = await Promise.all(
      (data || []).map(async (project) => {
        let tasksResult: Task[] = [];
        let milestonesResult: Milestone[] = [];
        let issuesResult: Issue[] = [];

        try {
          [tasksResult, milestonesResult, issuesResult] = await Promise.all([
            this.getTasks(project.id).catch(err => {
              console.error(`Failed to load tasks for project ${project.id}:`, err);
              return [] as Task[];
            }),
            this.getMilestones(project.id).catch(err => {
              console.error(`Failed to load milestones for project ${project.id}:`, err);
              return [] as Milestone[];
            }),
            this.getIssues(project.id).catch(err => {
              console.error(`Failed to load issues for project ${project.id}:`, err);
              return [] as Issue[];
            }),
          ]);
        } catch (err) {
          console.error(`Failed to load details for project ${project.id}:`, err);
        }

        return mapDbProjectToProject(project, tasksResult, milestonesResult, issuesResult);
      })
    );

    return projectsWithDetails;
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

    // Fetch related data in parallel with resilient error handling
    let tasksResult: Task[] = [];
    let milestonesResult: Milestone[] = [];
    let issuesResult: Issue[] = [];

    try {
      [tasksResult, milestonesResult, issuesResult] = await Promise.all([
        this.getTasks(id).catch(err => {
          console.error(`Failed to load tasks for project ${id}:`, err);
          return [] as Task[];
        }),
        this.getMilestones(id).catch(err => {
          console.error(`Failed to load milestones for project ${id}:`, err);
          return [] as Milestone[];
        }),
        this.getIssues(id).catch(err => {
          console.error(`Failed to load issues for project ${id}:`, err);
          return [] as Issue[];
        }),
      ]);
    } catch (err) {
      console.error(`Failed to load details for project ${id}:`, err);
    }

    return mapDbProjectToProject(project, tasksResult, milestonesResult, issuesResult);
  },

  /**
   * Create new project
   */
  async create(
    project: { name: string; description?: string; stage?: string; type?: string; progress?: number; startDate?: string; targetDate?: string; icon?: string },
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
        type: project.type,
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
        type: project.type, // Add type
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
        type: updates.type, // Add type update
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

    // Step 1: Fetch tasks with checklists (no FK hints needed - checklists has single FK to tasks)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, checklists(*)')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const taskIds = data.map(t => t.id);

    // Step 2: Fetch assignees, dependencies, and attachments separately (no FK hints)
    const [assigneesResult, depsResult, attachmentsResult] = await Promise.all([
      supabase.from('task_assignees').select('task_id, user_id').in('task_id', taskIds),
      supabase.from('task_dependencies').select('task_id, depends_on_id').in('task_id', taskIds),
      supabase.from('attachments').select('*').in('entity_id', taskIds).eq('entity_type', 'task'),
    ]);

    // Step 3: Fetch profiles for all referenced user IDs
    const allUserIds = [...new Set([
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
    return data.map(task => {
      const taskAssigneeRows = (assigneesResult.data || []).filter(a => a.task_id === task.id);
      const taskDeps = (depsResult.data || []).filter(d => d.task_id === task.id);
      const taskAttachments = (attachmentsResult.data || []).filter(a => a.entity_id === task.id);

      // Enrich attachments with profile data
      const enrichedAttachments = taskAttachments.map(a => ({
        ...a,
        profiles: a.uploaded_by ? profilesMap[a.uploaded_by] || null : null,
      }));

      const assignees: TeamMember[] = taskAssigneeRows.map(ta => {
        const profile = profilesMap[ta.user_id];
        return {
          id: profile?.id || ta.user_id,
          name: profile?.name || 'Unknown',
          role: 'member' as const,
          avatar: profile?.avatar_url || undefined,
          initials: profile?.initials || 'UN',
          email: profile?.email || '',
        };
      });

      const taskWithExtras = {
        ...task,
        task_dependencies: taskDeps,
        attachments: enrichedAttachments,
      };

      return mapDbTaskToTask(taskWithExtras, assignees);
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

    // Step 1: Fetch issues without FK hints to profiles
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('project_id', projectId)
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

    // Step 3: Fetch profiles for all referenced user IDs (reporters + assignees + attachment uploaders)
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
      } : undefined;

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
