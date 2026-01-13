// OpenPlan AI Type Definitions

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type ModuleType = 'hardware' | 'software' | 'firmware' | 'testing';
export type ProjectStage = 'concept' | 'design' | 'development' | 'testing' | 'production';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  initials: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedBy: TeamMember;
  uploadedAt: string;
  url: string;
}

export interface Comment {
  id: string;
  content: string;
  author: TeamMember;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  module: ModuleType;
  assignee?: TeamMember;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[]; // Task IDs this task depends on
  blockedBy: string[]; // Task IDs blocking this task
  tags: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description?: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  stage: ProjectStage;
  progress: number; // 0-100
  startDate: string;
  targetDate: string;
  team: TeamMember[];
  tasks: Task[];
  milestones: Milestone[];
  modules: {
    type: ModuleType;
    name: string;
    progress: number;
    taskCount: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'comment_added' | 'milestone_reached' | 'status_changed';
  title: string;
  description: string;
  user: TeamMember;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  timestamp: string;
}

// View types for the project detail page
export type ProjectView = 'kanban' | 'timeline' | 'list' | 'dependencies';

// Filter options
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: Priority[];
  module?: ModuleType[];
  assignee?: string[];
}

// Team member status
export type MemberStatus = 'active' | 'inactive' | 'pending';

// Extended team member for management
export interface ExtendedTeamMember extends TeamMember {
  status: MemberStatus;
  department?: string;
  joinedAt?: string;
  projectCount?: number;
}

// User settings/preferences
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  compactMode: boolean;
  notifications: {
    taskAssignments: boolean;
    taskCompletions: boolean;
    comments: boolean;
    projectUpdates: boolean;
    milestoneReminders: boolean;
    emailDigest: 'daily' | 'weekly' | 'none';
  };
}

// Workspace settings
export interface WorkspaceSettings {
  name: string;
  description: string;
  timezone: string;
  dateFormat: string;
}
