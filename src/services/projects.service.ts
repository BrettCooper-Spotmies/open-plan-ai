import { supabase } from '@/integrations/supabase/client';
import { Project, Task, Milestone, Issue, TeamMember, Activity, Comment } from '@/types';
import { projects as mockProjects, teamMembers as mockTeamMembers, projectModules as mockModules, projectIssues as mockIssues } from '@/data/mockData';
import { config } from '@/config';
import { activitiesService } from './activities.service';
import { modulesService } from './modules.service';

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
        role: a.profiles.role || '',
      } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: '' }
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
    attachments,
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    estimatedHours: dbTask.estimated_hours ? parseFloat(dbTask.estimated_hours) : undefined,
    actualHours: dbTask.actual_hours ? parseFloat(dbTask.actual_hours) : undefined,
    milestoneId: dbTask.milestone_id || undefined,
    moduleId: dbTask.module_id || undefined,
    moduleIds: dbTask.module_ids || [],
  };
}

// Map database project to frontend Project type
function mapDbProjectToProject(dbProject: any, tasks: Task[] = [], milestones: Milestone[] = [], issues: Issue[] = [], team: TeamMember[] = [], modules: any[] = []): Project {
  // Re-derive linked IDs for each milestone from the tasks and modules lists
  // (milestones were mapped before tasks/modules were available, so we re-enrich here)
  const enrichedMilestones = milestones.map(m => ({
    ...m,
    linkedTaskIds: tasks.filter(t => t.milestoneId === m.id).map(t => t.id),
    linkedModuleIds: modules.filter(mod => mod.milestone_id === m.id).map(mod => mod.id),
  }));

  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description || '',
    stage: dbProject.stage,
    progress: dbProject.progress || 0,
    startDate: dbProject.start_date || '',
    targetDate: dbProject.target_date || '',
    type: dbProject.type,
    icon: dbProject.icon || '📁',
    clientName: dbProject.client_name || '',
    clientOrganization: dbProject.client_organization || '',
    clientContact: dbProject.client_contact || '',
    notes: dbProject.notes || '',
    departments: dbProject.departments || [],
    tasks,
    milestones: enrichedMilestones,
    issues,
    modules: [], // Legacy empty for now
    projectModules: modules.map(m => ({
      id: m.id,
      name: m.name,
      type: m.module_type || 'software',
      description: m.description,
      progress: m.progress || 0,
      status: m.status || 'active',
      createdAt: m.created_at,
      milestoneId: m.milestone_id || undefined,
    })),
    team,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  };
}

// Map database milestone to frontend Milestone type
function mapDbMilestoneToMilestone(dbMilestone: any, allTasks: Task[] = [], allModules: any[] = []): Milestone {
  return {
    id: dbMilestone.id,
    title: dbMilestone.name,
    date: dbMilestone.due_date || '',
    completed: dbMilestone.status === 'completed',
    completedAt: dbMilestone.status === 'completed' ? dbMilestone.updated_at : undefined,
    description: dbMilestone.description || '',
    // Derive linked IDs from tasks/modules that point to this milestone
    linkedTaskIds: allTasks.filter(t => t.milestoneId === dbMilestone.id).map(t => t.id),
    linkedModuleIds: allModules.filter(m => m.milestone_id === dbMilestone.id).map(m => m.id),
  };
}

// Map database issue to frontend Issue type
function mapDbIssueToIssue(dbIssue: any, assignees: TeamMember[] = [], reportedBy?: TeamMember): Issue {
  const defaultReporter: TeamMember = {
    id: dbIssue.reported_by || 'unknown',
    name: 'Unknown User',
    email: '',
    role: reportedBy?.role || '',
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
    comments: dbIssue.comments || [],
    blocksTaskIds: dbIssue.blocks_task_ids || [],
    blocksMilestoneIds: dbIssue.blocks_milestone_ids || [],
    blockedBy: dbIssue.blocked_by_task_ids || [],
  };
}

function mapDbCommentToComment(dbComment: any): Comment {
  const profile = Array.isArray(dbComment.profiles) ? dbComment.profiles[0] : dbComment.profiles;
  return {
    id: dbComment.id,
    content: dbComment.content,
    createdAt: dbComment.created_at,
    author: {
      id: profile?.id || dbComment.author_id || 'unknown',
      name: profile?.name || 'Unknown User',
      email: profile?.email || '',
      initials: profile?.initials || 'UN',
      role: 'member',
      avatar: profile?.avatar_url || undefined,
    },
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
        let modulesResult: any[] = [];

        try {
          [tasksResult, milestonesResult, issuesResult, modulesResult] = await Promise.all([
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
            modulesService.getByProjectId(project.id).catch(err => {
              console.error(`Failed to load modules for project ${project.id}:`, err);
              return [];
            }),
          ]);
        } catch (err) {
          console.error(`Failed to load details for project ${project.id}:`, err);
        }

        return mapDbProjectToProject(project, tasksResult, milestonesResult, issuesResult, [], modulesResult);
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
    let teamResult: TeamMember[] = [];
    let modulesResult: any[] = [];

    try {
      [tasksResult, milestonesResult, issuesResult, teamResult, modulesResult] = await Promise.all([
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
        this.getProjectMembers(id).catch(err => {
          console.error(`Failed to load team for project ${id}:`, err);
          return [] as TeamMember[];
        }),
        modulesService.getByProjectId(id).catch(err => {
          console.error(`Failed to load modules for project ${id}:`, err);
          return [];
        }),
      ]);
    } catch (err) {
      console.error(`Failed to load details for project ${id}:`, err);
    }

    return mapDbProjectToProject(project, tasksResult, milestonesResult, issuesResult, teamResult, modulesResult);
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
        icon: project.icon || '📁',
        type: project.type,
        client_name: project.clientName,
        client_organization: project.clientOrganization,
        client_contact: project.clientContact,
        notes: project.notes,
        departments: project.departments,
        created_by: user?.id || null,
      }])
      .select()
      .single();

    if (error) throw error;

    // Log activity
    activitiesService.create({
      project_id: data.id,
      activity_type: 'project_created',
      description: `created project "${data.name}"`,
      user_id: user?.id || null,
      entity_id: data.id,
      entity_type: 'project',
    }).catch(() => { /* non-critical */ });

    // Return full project with all details
    return (await this.getById(data.id))!;
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
        icon: updates.icon,
        type: updates.type,
        client_name: updates.clientName,
        client_organization: updates.clientOrganization,
        client_contact: updates.clientContact,
        notes: updates.notes,
        departments: updates.departments,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Return full project with all details
    return (await this.getById(id))!;
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

    const { error } = await (supabase.rpc as any)('soft_delete_project', { project_id: id });
    if (error) {
      console.error('[projectsService] soft_delete_project failed', error);
      throw error;
    }
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

    // Step 4: Fetch project roles for all users in the project to use for assignees
    const { data: projectMembers } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', projectId);
    const memberRoles = Object.fromEntries((projectMembers || []).map(pm => [pm.user_id, pm.role]));

    // Step 5: Map everything together client-side
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
          role: memberRoles[ta.user_id] || profile?.role || '',
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
    return (data || []).map(m => mapDbMilestoneToMilestone(m));

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
    const [assigneesResult, attachmentsResult, commentsResult] = await Promise.all([
      supabase.from('issue_assignees').select('issue_id, user_id').in('issue_id', issueIds),
      supabase.from('attachments').select('*').in('entity_id', issueIds).eq('entity_type', 'issue'),
      supabase
        .from('comments')
        .select('id, content, created_at, author_id, entity_id, profiles:author_id(id, name, email, initials, avatar_url)')
        .in('entity_id', issueIds)
        .eq('entity_type', 'issue')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
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

    // Step 4: Fetch project roles
    const { data: projectMembers } = await supabase
      .from('project_members')
      .select('user_id, role')
      .eq('project_id', projectId);
    const memberRoles = Object.fromEntries((projectMembers || []).map(pm => [pm.user_id, pm.role]));

    // Step 5: Map everything together client-side
    return data.map(issue => {
      const issueAssigneeRows = (assigneesResult.data || []).filter(a => a.issue_id === issue.id);
      const issueAttachments = (attachmentsResult.data || []).filter(a => a.entity_id === issue.id);
      const issueComments = (commentsResult.data || [])
        .filter((c: any) => c.entity_id === issue.id)
        .map((c: any) => mapDbCommentToComment(c));

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
          role: memberRoles[ia.user_id] || profile?.role || '',
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
            role: uploaderProfile?.role || 'member',
          } : { id: a.uploaded_by, name: 'Unknown', email: '', initials: 'UN', role: 'member' }
        };
      });

      return mapDbIssueToIssue({ ...issue, attachments, comments: issueComments }, assignees, reporter);
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
      .select('id, name, email, avatar_url, initials, role')
      .is('deleted_at', null);

    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      role: p.role || '',
      avatar: p.avatar_url || undefined,
      initials: p.initials,
      email: p.email,
    }));
  },

  /**
   * Get project members with roles
   */
  async getProjectMembers(projectId: string): Promise<TeamMember[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      // For mock data, just return a subset of team members
      return mockTeamMembers.slice(0, 3);
    }

    const { data, error } = await supabase
      .from('project_members')
      .select('role, user_id, profiles:user_id(id, name, email, avatar_url, initials, role)')
      .eq('project_id', projectId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((pm: any) => {
      const profile = Array.isArray(pm.profiles) ? pm.profiles[0] : pm.profiles;
      return {
        id: profile?.id || pm.user_id,
        name: profile?.name || 'Unknown User',
        email: profile?.email || '',
        role: pm.role,
        avatar: profile?.avatar_url || undefined,
        initials: profile?.initials || '??',
      };
    });
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
