import { Task, Issue } from '@/types';

export interface WorkerMessage {
  type: 'CALCULATE_KPI' | 'FILTER_TASKS';
  payload: unknown;
}

export interface KPIPayload {
  tasks: Task[];
  issues: Issue[];
}

export interface FilterPayload {
  tasks: Task[];
  filter: {
    moduleIds?: string[];
    milestoneIds?: string[];
    assigneeIds?: string[];
    priority?: string[];
    status?: string[];
    tags?: string[];
  };
}

export interface KPIResult {
  projectProgress: number;
  completedTasks: number;
  totalTasks: number;
  openIssues: number;
  criticalIssues: number;
  overdueTasks: number;
  avgCycleTime: number;
  trendData: { date: string; value: number }[];
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'CALCULATE_KPI': {
      const { tasks, issues } = payload as KPIPayload;
      const result = calculateKPIs(tasks, issues);
      self.postMessage({ type: 'CALCULATE_KPI_RESULT', payload: result });
      break;
    }
    case 'FILTER_TASKS': {
      const { tasks, filter } = payload as FilterPayload;
      const result = filterTasks(tasks, filter);
      self.postMessage({ type: 'FILTER_TASKS_RESULT', payload: result });
      break;
    }
  }
};

function calculateKPIs(tasks: Task[], issues: Issue[]): KPIResult {
  // Calculate project progress
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const projectProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Count open issues
  const openIssuesList = issues.filter(i => 
    i.status === 'open' || i.status === 'investigating'
  );
  const openIssues = openIssuesList.length;
  const criticalIssues = openIssuesList.filter(i => i.severity === 'critical').length;

  // Count overdue tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  }).length;

  // Calculate average cycle time
  const completedTasks = tasks.filter(t => 
    t.status === 'done' && t.startDate && t.updatedAt
  );
  
  let avgCycleTime = 0;
  if (completedTasks.length > 0) {
    const totalDays = completedTasks.reduce((sum, task) => {
      const start = new Date(task.startDate!);
      const end = new Date(task.updatedAt);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);
    avgCycleTime = Math.round((totalDays / completedTasks.length) * 10) / 10;
  }

  // Generate trend data for the last 30 days
  const trendData: { date: string; value: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Count tasks completed on or before this date
    const completedByDate = tasks.filter(t => {
      if (t.status !== 'done' || !t.updatedAt) return false;
      const taskDate = new Date(t.updatedAt).toISOString().split('T')[0];
      return taskDate <= dateStr;
    }).length;
    
    trendData.push({ date: dateStr, value: completedByDate });
  }

  return {
    projectProgress,
    completedTasks: completed,
    totalTasks: total,
    openIssues,
    criticalIssues,
    overdueTasks,
    avgCycleTime,
    trendData,
  };
}

function filterTasks(tasks: Task[], filter: FilterPayload['filter']): Task[] {
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
