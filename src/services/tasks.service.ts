import { supabase } from '@/integrations/supabase/client';
import { Task, TeamMember } from '@/types';
import { projects as mockProjects } from '@/data/mockData';
import { config } from '@/config';
import { attachmentsService } from './attachments.service';
import { activitiesService } from './activities.service';

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
    // Determine public URL (some queries might already have it, but we ensure it)
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
    projectId: dbTask.project_id || undefined,
  };
}

export const tasksService = {
  /**
   * Get all tasks across all projects
   */
  async getAll(): Promise<Task[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      return mockProjects.flatMap(p => p.tasks);
    }

    // Step 1: Fetch tasks with checklists (no FK hints needed)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, checklists(*)')
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
   * Get task by ID
   */
  async getById(taskId: string): Promise<Task | null> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      for (const project of mockProjects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) return { ...task };
      }
      return null;
    }

    // Step 1: Fetch task with checklists (no FK hints)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, checklists(*)')
      .eq('id', taskId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Step 2: Fetch assignees, dependencies, and attachments separately
    const [assigneesResult, depsResult, attachmentsResult] = await Promise.all([
      supabase.from('task_assignees').select('task_id, user_id').eq('task_id', taskId),
      supabase.from('task_dependencies').select('task_id, depends_on_id').eq('task_id', taskId),
      supabase.from('attachments').select('*').eq('entity_id', taskId).eq('entity_type', 'task'),
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

    // Step 4: Map together
    const enrichedAttachments = (attachmentsResult.data || []).map(a => ({
      ...a,
      profiles: a.uploaded_by ? profilesMap[a.uploaded_by] || null : null,
    }));

    const assignees: TeamMember[] = (assigneesResult.data || []).map(ta => {
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
      ...data,
      task_dependencies: depsResult.data || [],
      attachments: enrichedAttachments,
    };

    return mapDbTaskToTask(taskWithExtras, assignees);
  },

  /**
   * Create new task
   */
  async create(projectId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      project.tasks.push(newTask);
      return newTask;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: task.title,
        description: task.description || null,
        status: task.status,
        priority: task.priority,
        module_type: task.module || null,
        due_date: task.dueDate || null,
        start_date: task.startDate || null,
        tags: task.tags || [],
        estimated_hours: task.estimatedHours || null,
        milestone_id: task.milestoneId || null,
        module_id: task.moduleId || null,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;
    const newTask = data;

    // Add assignees if provided
    if (task.assignees && task.assignees.length > 0) {
      const assigneeInserts = task.assignees.map(a => ({
        task_id: newTask.id,
        user_id: a.id,
        assigned_by: user?.id || null,
      }));

      await supabase.from('task_assignees').insert(assigneeInserts);
    }

    // Add checklists if provided
    if (task.checklist && task.checklist.length > 0) {
      const checklistInserts = task.checklist.map((item, index) => ({
        task_id: newTask.id,
        text: item.text,
        completed: item.completed,
        position: index
      }));
      await supabase.from('checklists').insert(checklistInserts);
    }

    // Add dependencies if provided
    if (task.dependencies && task.dependencies.length > 0) {
      const dependencyInserts = task.dependencies.map(depId => ({
        task_id: newTask.id,
        depends_on_id: depId
      }));
      await supabase.from('task_dependencies').insert(dependencyInserts);
    }

    // Add attachments if provided
    if (task.attachments && task.attachments.length > 0) {
      const attachmentInserts = task.attachments.map(att => {
        // Try to extract file path from URL if possible
        // URL format: .../public/project-files/project-id/filename
        const urlParts = att.url.split('project-files/');
        const filePath = urlParts.length > 1 ? urlParts[1] : att.url.split('/').pop() || '';

        return {
          entity_id: newTask.id,
          entity_type: 'task',
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

    return this.getById(newTask.id) as Promise<Task>;
  },

  /**
   * Update existing task
   */
  async update(projectId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const taskIndex = project.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) throw new Error('Task not found');

      project.tasks[taskIndex] = {
        ...project.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...project.tasks[taskIndex] };
    }

    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.module !== undefined) updateData.module_type = updates.module;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.estimatedHours !== undefined) updateData.estimated_hours = updates.estimatedHours;
    if (updates.actualHours !== undefined) updateData.actual_hours = updates.actualHours;
    if (updates.milestoneId !== undefined) updateData.milestone_id = updates.milestoneId;
    if (updates.moduleId !== undefined) updateData.module_id = updates.moduleId;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    // Log activity if status changed
    if (updates.status !== undefined) {
      const { data: { user } } = await supabase.auth.getUser();
      activitiesService.create({
        project_id: projectId,
        activity_type: 'status_changed',
        description: `changed task "${data.title}" status to ${updates.status}`,
        user_id: user?.id || null,
        entity_id: taskId,
        entity_type: 'task',
      }).catch(() => { /* non-critical */ });
    }

    // Update assignees if provided
    if (updates.assignees !== undefined) {
      await supabase.from('task_assignees').delete().eq('task_id', taskId);
      if (updates.assignees.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const assigneeInserts = updates.assignees.map(a => ({
          task_id: taskId,
          user_id: a.id,
          assigned_by: user?.id || null,
        }));
        await supabase.from('task_assignees').insert(assigneeInserts);
      }
    }

    // Update checklists if provided
    if (updates.checklist !== undefined) {
      await supabase.from('checklists').delete().eq('task_id', taskId);
      if (updates.checklist && updates.checklist.length > 0) {
        const checklistInserts = updates.checklist.map((item, index) => ({
          task_id: taskId,
          text: item.text,
          completed: item.completed,
          position: index
        }));
        await supabase.from('checklists').insert(checklistInserts);
      }
    }

    // Update blockedBy (task dependencies where this task depends on others)
    // Note: "dependencies" (Blocking To) is computed client-side and updates the OTHER task's blockedBy
    if (updates.blockedBy !== undefined) {
      await supabase.from('task_dependencies').delete().eq('task_id', taskId);
      if (updates.blockedBy.length > 0) {
        const dependencyInserts = updates.blockedBy.map(depId => ({
          task_id: taskId,
          depends_on_id: depId
        }));
        await supabase.from('task_dependencies').insert(dependencyInserts);

        // Log activity for dependency added
        const { data: { user } } = await supabase.auth.getUser();
        activitiesService.create({
          project_id: projectId,
          activity_type: 'dependency_added',
          description: `added dependencies to task "${data.title}"`,
          user_id: user?.id || null,
          entity_id: taskId,
          entity_type: 'task',
        }).catch(() => { /* non-critical */ });
      }
    }
    // Update attachments if provided
    if (updates.attachments !== undefined) {
      // Fetch current attachments in DB for this task
      const { data: currentDbAttachments, error: fetchErr } = await supabase
        .from('attachments')
        .select('id')
        .eq('entity_id', taskId)
        .eq('entity_type', 'task');

      if (!fetchErr && currentDbAttachments) {
        const updatedIds = updates.attachments.map(a => a.id);
        const toDelete = currentDbAttachments.filter(dbA => !updatedIds.includes(dbA.id));

        for (const attachment of toDelete) {
          try {
            await attachmentsService.delete(attachment.id);
          } catch (err) {
            console.error('Failed to delete attachment during task update:', err);
          }
        }
      }
    }


    return this.getById(taskId) as Promise<Task>;
  },

  /**
   * Delete task (soft delete)
   */
  async delete(projectId: string, taskId: string): Promise<void> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (project) {
        const index = project.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
          project.tasks.splice(index, 1);
        }
      }
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;
  },

  /**
   * Batch update tasks (e.g., for drag-and-drop reordering)
   */
  async batchUpdate(projectId: string, updates: Array<{ id: string; updates: Partial<Task> }>): Promise<Task[]> {
    if (USE_MOCK_DATA && !USE_SUPABASE) {
      await mockDelay();
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) throw new Error('Project not found');

      const updatedTasks: Task[] = [];
      for (const { id, updates: taskUpdates } of updates) {
        const taskIndex = project.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
          project.tasks[taskIndex] = {
            ...project.tasks[taskIndex],
            ...taskUpdates,
            updatedAt: new Date().toISOString(),
          };
          updatedTasks.push({ ...project.tasks[taskIndex] });
        }
      }
      return updatedTasks;
    }

    // For Supabase, update each task individually
    const results: Task[] = [];
    for (const { id, updates: taskUpdates } of updates) {
      const updated = await this.update(projectId, id, taskUpdates);
      results.push(updated);
    }
    return results;
  },
};
