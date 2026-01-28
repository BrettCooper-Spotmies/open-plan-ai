import { supabase } from '@/integrations/supabase/client';
import { Task, TeamMember } from '@/types';
import { projects as mockProjects } from '@/data/mockData';
import { config } from '@/config';

// Environment flag to control data source
const USE_MOCK_DATA = config.api.useMockData;
const USE_SUPABASE = config.api.useSupabase;

// Simulate network delay for mock data
const mockDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Map database task to frontend Task type
function mapDbTaskToTask(dbTask: any, assignees: TeamMember[] = []): Task {
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
    checklist: [],
    dependencies: [],
    blockedBy: [],
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at,
    estimatedHours: dbTask.estimated_hours ? parseFloat(dbTask.estimated_hours) : undefined,
    actualHours: dbTask.actual_hours ? parseFloat(dbTask.actual_hours) : undefined,
    milestoneId: dbTask.milestone_id || undefined,
    moduleId: dbTask.module_id || undefined,
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

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees(
          user_id,
          profile:profiles!task_assignees_user_id_fkey(id, name, email, avatar_url, initials)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(task => {
      const assignees: TeamMember[] = (task.task_assignees || []).map((ta: any) => ({
        id: ta.profile?.id || ta.user_id,
        name: ta.profile?.name || 'Unknown',
        role: 'member',
        avatar: ta.profile?.avatar_url || undefined,
        initials: ta.profile?.initials || 'UN',
        email: ta.profile?.email || '',
      }));
      return mapDbTaskToTask(task, assignees);
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

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees(
          user_id,
          profile:profiles!task_assignees_user_id_fkey(id, name, email, avatar_url, initials)
        )
      `)
      .eq('id', taskId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const assignees: TeamMember[] = (data.task_assignees || []).map((ta: any) => ({
      id: ta.profile?.id || ta.user_id,
      name: ta.profile?.name || 'Unknown',
      role: 'member',
      avatar: ta.profile?.avatar_url || undefined,
      initials: ta.profile?.initials || 'UN',
      email: ta.profile?.email || '',
    }));

    return mapDbTaskToTask(data, assignees);
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

    // Add assignees if provided
    if (task.assignees && task.assignees.length > 0) {
      const assigneeInserts = task.assignees.map(a => ({
        task_id: data.id,
        user_id: a.id,
        assigned_by: user?.id || null,
      }));

      await supabase.from('task_assignees').insert(assigneeInserts);
    }

    return mapDbTaskToTask(data, task.assignees || []);
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

    // Update assignees if provided
    if (updates.assignees !== undefined) {
      // Remove existing assignees
      await supabase.from('task_assignees').delete().eq('task_id', taskId);
      
      // Add new assignees
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

    return mapDbTaskToTask(data, updates.assignees || []);
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
