export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  openIssues: number;
  teamMembers: number;
  upcomingMilestones: number;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  actor?: { id: string; name: string; avatar?: string };
  project?: { id: string; name: string };
}

export interface DashboardMilestone {
  id: string;
  name: string;
  dueDate: string;
  projectId: string;
  projectName: string;
  tasksTotal: number;
  tasksCompleted: number;
}
