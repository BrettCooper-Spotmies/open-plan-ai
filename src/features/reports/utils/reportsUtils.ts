import { Task, Issue, Milestone, TeamMember, Module, Priority, TaskStatus, Project } from '@/types';
import { 
  subDays, 
  isAfter, 
  isBefore, 
  parseISO, 
  differenceInDays, 
  format, 
  startOfDay,
  eachDayOfInterval,
  isWithinInterval
} from 'date-fns';

export type ReportTimeRange = '7d' | '30d' | '90d' | 'custom';

export interface ReportFilter {
  projectId?: string;
  timeRange: ReportTimeRange;
  customDateRange?: { start: string; end: string };
  moduleIds?: string[];
  milestoneIds?: string[];
  assigneeIds?: string[];
  priority?: Priority[];
  status?: TaskStatus[];
  tags?: string[];
}

export interface ReportKPI {
  projectProgress: number;
  completedTasks: number;
  totalTasks: number;
  openIssues: number;
  criticalIssues: number;
  overdueTasks: number;
  avgCycleTime: number;
  trendData: { date: string; value: number }[];
}

export interface StatusBreakdown {
  status: TaskStatus;
  count: number;
  percentage: number;
}

export interface MilestoneHealthItem {
  milestone: Milestone;
  status: 'on-track' | 'at-risk' | 'blocked' | 'complete';
  progress: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  daysRemaining: number;
}

export interface TeamWorkloadItem {
  member: TeamMember;
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  inProgressTasks: number;
}

export interface ModuleProgressItem {
  module: Module;
  progress: number;
  totalTasks: number;
  completedTasks: number;
}

export interface TrendDataPoint {
  date: string;
  completed: number;
  cumulative: number;
  remaining: number;
}

// Get date range based on time range selection
export function getDateRangeFromTimeRange(
  timeRange: ReportTimeRange,
  customRange?: { start: string; end: string }
): { start: Date; end: Date } {
  const today = startOfDay(new Date());
  
  switch (timeRange) {
    case '7d':
      return { start: subDays(today, 7), end: today };
    case '30d':
      return { start: subDays(today, 30), end: today };
    case '90d':
      return { start: subDays(today, 90), end: today };
    case 'custom':
      if (customRange) {
        return { 
          start: parseISO(customRange.start), 
          end: parseISO(customRange.end) 
        };
      }
      return { start: subDays(today, 30), end: today };
    default:
      return { start: subDays(today, 30), end: today };
  }
}

// Filter tasks by time range
export function filterTasksByTimeRange(
  tasks: Task[],
  dateRange: { start: Date; end: Date }
): Task[] {
  return tasks.filter(task => {
    if (!task.dueDate) return true;
    const dueDate = parseISO(task.dueDate);
    return isWithinInterval(dueDate, { start: dateRange.start, end: dateRange.end }) ||
           isBefore(dueDate, dateRange.start);
  });
}

// Calculate project progress
export function calculateProjectProgress(tasks: Task[]): { 
  progress: number; 
  completed: number; 
  total: number 
} {
  const total = tasks.length;
  if (total === 0) return { progress: 0, completed: 0, total: 0 };
  
  const completed = tasks.filter(t => t.status === 'done').length;
  return {
    progress: Math.round((completed / total) * 100),
    completed,
    total
  };
}

// Count open issues
export function countOpenIssues(issues: Issue[]): { total: number; critical: number } {
  const openIssues = issues.filter(i => 
    i.status === 'open' || i.status === 'investigating'
  );
  const criticalIssues = openIssues.filter(i => i.severity === 'critical');
  
  return {
    total: openIssues.length,
    critical: criticalIssues.length
  };
}

// Count overdue tasks
export function countOverdueTasks(tasks: Task[]): number {
  const today = startOfDay(new Date());
  return tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    return isBefore(parseISO(task.dueDate), today);
  }).length;
}

// Calculate average cycle time
export function calculateAvgCycleTime(tasks: Task[]): number {
  const completedTasks = tasks.filter(t => 
    t.status === 'done' && t.startDate && t.updatedAt
  );
  
  if (completedTasks.length === 0) return 0;
  
  const totalDays = completedTasks.reduce((sum, task) => {
    const start = parseISO(task.startDate!);
    const end = parseISO(task.updatedAt);
    return sum + differenceInDays(end, start);
  }, 0);
  
  return Math.round((totalDays / completedTasks.length) * 10) / 10;
}

// Get task status breakdown
export function getTaskStatusBreakdown(tasks: Task[]): StatusBreakdown[] {
  const total = tasks.length;
  if (total === 0) return [];
  
  const statusOrder: TaskStatus[] = ['todo', 'in-progress', 'review', 'done', 'blocked'];
  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);
  
  return statusOrder.map(status => ({
    status,
    count: counts[status] || 0,
    percentage: Math.round(((counts[status] || 0) / total) * 100)
  })).filter(item => item.count > 0);
}

// Get milestone health
export function getMilestoneHealth(
  milestones: Milestone[],
  tasks: Task[]
): MilestoneHealthItem[] {
  const today = startOfDay(new Date());
  
  return milestones.map(milestone => {
    const linkedTasks = tasks.filter(t => t.milestoneId === milestone.id);
    const completedTasks = linkedTasks.filter(t => t.status === 'done').length;
    const blockedTasks = linkedTasks.filter(t => t.status === 'blocked').length;
    const overdueTasks = linkedTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return isBefore(parseISO(t.dueDate), today);
    }).length;
    
    const totalTasks = linkedTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const daysRemaining = milestone.date 
      ? differenceInDays(parseISO(milestone.date), today)
      : 0;
    
    let status: MilestoneHealthItem['status'] = 'on-track';
    
    if (milestone.completed || progress === 100) {
      status = 'complete';
    } else if (blockedTasks > 0) {
      status = 'blocked';
    } else if (overdueTasks > 0 || (progress < 50 && daysRemaining < 7 && daysRemaining >= 0)) {
      status = 'at-risk';
    }
    
    return {
      milestone,
      status,
      progress,
      totalTasks,
      completedTasks,
      overdueTasks,
      daysRemaining
    };
  });
}

// Get team workload
export function getTeamWorkload(
  tasks: Task[],
  teamMembers: TeamMember[]
): TeamWorkloadItem[] {
  const today = startOfDay(new Date());
  
  return teamMembers.map(member => {
    const memberTasks = tasks.filter(t => 
      t.assignees?.some(a => a.id === member.id)
    );
    
    const overdueTasks = memberTasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return isBefore(parseISO(t.dueDate), today);
    }).length;
    
    const completedTasks = memberTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = memberTasks.filter(t => t.status === 'in-progress').length;
    
    return {
      member,
      totalTasks: memberTasks.length,
      overdueTasks,
      completedTasks,
      inProgressTasks
    };
  }).filter(item => item.totalTasks > 0)
    .sort((a, b) => b.totalTasks - a.totalTasks);
}

// Get module progress
export function getModuleProgress(
  tasks: Task[],
  modules: Module[]
): ModuleProgressItem[] {
  return modules.map(module => {
    const moduleTasks = tasks.filter(t => t.moduleId === module.id);
    const completedTasks = moduleTasks.filter(t => t.status === 'done').length;
    const totalTasks = moduleTasks.length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return {
      module,
      progress,
      totalTasks,
      completedTasks
    };
  }).filter(item => item.totalTasks > 0);
}

// Get completed tasks trend
export function getCompletedTasksTrend(
  tasks: Task[],
  dateRange: { start: Date; end: Date }
): TrendDataPoint[] {
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  const totalTasks = tasks.length;
  
  let cumulative = 0;
  
  return days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const completedOnDay = tasks.filter(t => {
      if (t.status !== 'done' || !t.updatedAt) return false;
      const completedDate = format(parseISO(t.updatedAt), 'yyyy-MM-dd');
      return completedDate === dayStr;
    }).length;
    
    cumulative += completedOnDay;
    
    return {
      date: format(day, 'MMM dd'),
      completed: completedOnDay,
      cumulative,
      remaining: totalTasks - cumulative
    };
  });
}

// Calculate all KPIs
export function calculateKPIs(
  tasks: Task[],
  issues: Issue[],
  dateRange: { start: Date; end: Date }
): ReportKPI {
  const progressData = calculateProjectProgress(tasks);
  const issueData = countOpenIssues(issues);
  const trendData = getCompletedTasksTrend(tasks, dateRange);
  
  return {
    projectProgress: progressData.progress,
    completedTasks: progressData.completed,
    totalTasks: progressData.total,
    openIssues: issueData.total,
    criticalIssues: issueData.critical,
    overdueTasks: countOverdueTasks(tasks),
    avgCycleTime: calculateAvgCycleTime(tasks),
    trendData: trendData.map(d => ({ date: d.date, value: d.cumulative }))
  };
}

// Apply filters to tasks
export function applyFilters(
  tasks: Task[],
  filter: ReportFilter
): Task[] {
  return tasks.filter(task => {
    if (filter.moduleIds?.length && task.moduleId && !filter.moduleIds.includes(task.moduleId)) {
      return false;
    }
    if (filter.milestoneIds?.length && task.milestoneId && !filter.milestoneIds.includes(task.milestoneId)) {
      return false;
    }
    if (filter.assigneeIds?.length) {
      const hasMatchingAssignee = task.assignees?.some(a => filter.assigneeIds!.includes(a.id));
      if (!hasMatchingAssignee) return false;
    }
    if (filter.priority?.length && !filter.priority.includes(task.priority)) {
      return false;
    }
    if (filter.status?.length && !filter.status.includes(task.status)) {
      return false;
    }
    if (filter.tags?.length) {
      const hasMatchingTag = task.tags?.some(t => filter.tags!.includes(t));
      if (!hasMatchingTag) return false;
    }
    return true;
  });
}

// Get status color class
export function getStatusColor(status: TaskStatus): string {
  const colors: Record<TaskStatus, string> = {
    'todo': 'hsl(var(--status-todo))',
    'in-progress': 'hsl(var(--status-in-progress))',
    'review': 'hsl(var(--status-review))',
    'done': 'hsl(var(--status-done))',
    'blocked': 'hsl(var(--status-blocked))'
  };
  return colors[status];
}

// Get status label
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'review': 'Review',
    'done': 'Done',
    'blocked': 'Blocked'
  };
  return labels[status];
}
