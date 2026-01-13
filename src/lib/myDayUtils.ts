import { Task, Project, TaskStatus } from '@/types';

export interface MyDayTask extends Task {
  projectId: string;
  projectName: string;
  isOverdue: boolean;
  isDueToday: boolean;
  isBlockingOthers: boolean;
  isBlocked: boolean;
  hasUnresolvedDependencies: boolean;
}

export type DueDateStatus = 'overdue' | 'today' | 'upcoming' | 'none';

/**
 * Get due date status relative to today
 */
export function getDueDateStatus(dueDate?: string): DueDateStatus {
  if (!dueDate) return 'none';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

/**
 * Check if a task is blocking other tasks
 */
export function isBlockingOthers(task: Task, allTasks: Task[]): boolean {
  return allTasks.some(t => 
    t.id !== task.id && 
    (t.dependencies.includes(task.id) || t.blockedBy.includes(task.id))
  );
}

/**
 * Check if a task has unresolved dependencies
 */
export function hasUnresolvedDependencies(task: Task, allTasks: Task[]): boolean {
  if (task.dependencies.length === 0 && task.blockedBy.length === 0) return false;
  
  const dependencyIds = [...task.dependencies, ...task.blockedBy];
  return dependencyIds.some(depId => {
    const depTask = allTasks.find(t => t.id === depId);
    return depTask && depTask.status !== 'done';
  });
}

/**
 * Get all tasks assigned to a user across all projects
 */
export function getUserTasks(projects: Project[], userId: string): MyDayTask[] {
  const allTasks: Task[] = projects.flatMap(p => p.tasks);
  
  return projects.flatMap(project => 
    project.tasks
      .filter(task => task.assignee?.id === userId && task.status !== 'done')
      .map(task => {
        const dueDateStatus = getDueDateStatus(task.dueDate);
        return {
          ...task,
          projectId: project.id,
          projectName: project.name,
          isOverdue: dueDateStatus === 'overdue',
          isDueToday: dueDateStatus === 'today',
          isBlockingOthers: isBlockingOthers(task, allTasks),
          isBlocked: task.status === 'blocked' || task.blockedBy.length > 0,
          hasUnresolvedDependencies: hasUnresolvedDependencies(task, allTasks),
        };
      })
  );
}

/**
 * Categorize tasks into My Day sections
 */
export function categorizeMyDayTasks(tasks: MyDayTask[]): {
  needsAttention: MyDayTask[];
  readyToWork: MyDayTask[];
  waitingBlocked: MyDayTask[];
} {
  const needsAttention: MyDayTask[] = [];
  const readyToWork: MyDayTask[] = [];
  const waitingBlocked: MyDayTask[] = [];

  for (const task of tasks) {
    // Check if task needs attention
    const needsAttentionCheck = 
      task.isOverdue ||
      task.isDueToday ||
      task.priority === 'critical' ||
      task.priority === 'high' ||
      task.isBlockingOthers;

    // Check if task is blocked
    const isBlocked = task.isBlocked || task.hasUnresolvedDependencies;

    if (isBlocked) {
      waitingBlocked.push(task);
    } else if (needsAttentionCheck) {
      needsAttention.push(task);
    } else {
      readyToWork.push(task);
    }
  }

  // Sort by priority and due date
  const sortTasks = (a: MyDayTask, b: MyDayTask) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return a.dueDate ? -1 : 1;
  };

  return {
    needsAttention: needsAttention.sort(sortTasks),
    readyToWork: readyToWork.sort(sortTasks),
    waitingBlocked: waitingBlocked.sort(sortTasks),
  };
}

/**
 * Get module display info
 */
export function getModuleInfo(module: string): { label: string; color: string } {
  const moduleMap: Record<string, { label: string; color: string }> = {
    hardware: { label: 'Hardware', color: 'bg-module-hardware text-white' },
    software: { label: 'Software', color: 'bg-module-software text-white' },
    firmware: { label: 'Firmware', color: 'bg-module-firmware text-white' },
    testing: { label: 'Testing', color: 'bg-module-testing text-white' },
    design: { label: 'Design', color: 'bg-blue-500 text-white' },
    procurement: { label: 'Procurement', color: 'bg-amber-500 text-white' },
    manufacturing: { label: 'Manufacturing', color: 'bg-slate-500 text-white' },
    qa: { label: 'QA', color: 'bg-purple-500 text-white' },
    logistics: { label: 'Logistics', color: 'bg-cyan-500 text-white' },
  };
  return moduleMap[module] || { label: module, color: 'bg-muted text-muted-foreground' };
}

/**
 * Get priority display info
 */
export function getPriorityInfo(priority: string): { label: string; color: string } {
  const priorityMap: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: 'bg-priority-critical text-white' },
    high: { label: 'High', color: 'bg-priority-high text-white' },
    medium: { label: 'Medium', color: 'bg-priority-medium text-black' },
    low: { label: 'Low', color: 'bg-priority-low text-muted-foreground' },
  };
  return priorityMap[priority] || { label: priority, color: 'bg-muted text-muted-foreground' };
}

/**
 * Format relative date for display
 */
export function formatDueDate(dueDate?: string): string {
  if (!dueDate) return 'No due date';
  
  const status = getDueDateStatus(dueDate);
  const date = new Date(dueDate);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  switch (status) {
    case 'overdue':
      return `Overdue: ${formatted}`;
    case 'today':
      return 'Due Today';
    default:
      return `Due ${formatted}`;
  }
}

/**
 * Check if due date is tomorrow
 */
export function isDueTomorrow(dueDate?: string): boolean {
  if (!dueDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  return due.getTime() === tomorrow.getTime();
}

/**
 * Check if due date is within this week
 */
export function isDueThisWeek(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  return due > today && due <= weekEnd;
}

/**
 * Group tasks by project
 */
export function groupTasksByProject(tasks: MyDayTask[]): Map<string, { name: string; tasks: MyDayTask[] }> {
  const groups = new Map<string, { name: string; tasks: MyDayTask[] }>();
  
  for (const task of tasks) {
    const existing = groups.get(task.projectId);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(task.projectId, { name: task.projectName, tasks: [task] });
    }
  }
  
  return groups;
}

/**
 * Group tasks by progress/status
 */
export function groupTasksByProgress(tasks: MyDayTask[]): {
  dependency: MyDayTask[];
  notStarted: MyDayTask[];
  inProgress: MyDayTask[];
  completed: MyDayTask[];
} {
  const groups = {
    dependency: [] as MyDayTask[],
    notStarted: [] as MyDayTask[],
    inProgress: [] as MyDayTask[],
    completed: [] as MyDayTask[],
  };
  
  for (const task of tasks) {
    if (task.status === 'blocked' || task.isBlocked || task.hasUnresolvedDependencies) {
      groups.dependency.push(task);
    } else if (task.status === 'done') {
      groups.completed.push(task);
    } else if (task.status === 'in-progress' || task.status === 'review') {
      groups.inProgress.push(task);
    } else {
      groups.notStarted.push(task);
    }
  }
  
  return groups;
}

/**
 * Group tasks by due date
 */
export function groupTasksByDueDate(tasks: MyDayTask[]): {
  late: MyDayTask[];
  today: MyDayTask[];
  tomorrow: MyDayTask[];
  thisWeek: MyDayTask[];
  later: MyDayTask[];
} {
  const groups = {
    late: [] as MyDayTask[],
    today: [] as MyDayTask[],
    tomorrow: [] as MyDayTask[],
    thisWeek: [] as MyDayTask[],
    later: [] as MyDayTask[],
  };
  
  for (const task of tasks) {
    if (task.isOverdue) {
      groups.late.push(task);
    } else if (task.isDueToday) {
      groups.today.push(task);
    } else if (isDueTomorrow(task.dueDate)) {
      groups.tomorrow.push(task);
    } else if (isDueThisWeek(task.dueDate)) {
      groups.thisWeek.push(task);
    } else {
      groups.later.push(task);
    }
  }
  
  return groups;
}

/**
 * Group tasks by priority
 */
export function groupTasksByPriority(tasks: MyDayTask[]): {
  urgent: MyDayTask[];
  important: MyDayTask[];
  medium: MyDayTask[];
  low: MyDayTask[];
} {
  const groups = {
    urgent: [] as MyDayTask[],
    important: [] as MyDayTask[],
    medium: [] as MyDayTask[],
    low: [] as MyDayTask[],
  };
  
  for (const task of tasks) {
    switch (task.priority) {
      case 'critical':
        groups.urgent.push(task);
        break;
      case 'high':
        groups.important.push(task);
        break;
      case 'medium':
        groups.medium.push(task);
        break;
      default:
        groups.low.push(task);
    }
  }
  
  return groups;
}
