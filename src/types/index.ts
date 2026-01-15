// OpenPlan AI Type Definitions

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
export type Priority = 'critical' | 'high' | 'medium' | 'low';

// Expanded ModuleType for hardware workflows
export type ModuleType = 
  | 'hardware' 
  | 'software' 
  | 'firmware' 
  | 'testing'
  | 'design'           // CAD, mechanical design
  | 'procurement'      // Sourcing, vendor management
  | 'manufacturing'    // Assembly, production
  | 'qa'               // Quality assurance
  | 'logistics'        // Shipping, inventory
  | 'enclosure'        // Housing, packaging
  | 'pcb'              // PCB design & layout
  | 'power';           // Power systems

export type ProjectStage = 'concept' | 'design' | 'development' | 'testing' | 'production';

// Issue types
export type IssueSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type IssueStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'wont-fix';
export type IssueCategory = 
  | 'defect'           // Product defect
  | 'risk'             // Identified risk
  | 'supplier'         // Supplier/vendor issue
  | 'compliance'       // Regulatory/compliance gap
  | 'test-failure'     // Test failure
  | 'design-change'    // Design change request
  | 'other';

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

// First-class Module entity
export interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description?: string;
  color?: string;           // For visual distinction
  owner?: TeamMember;       // Module lead/owner
  createdAt: string;
}

// Enhanced Milestone interface
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: string;              // Target date
  completed: boolean;
  completedAt?: string;      // Actual completion date
  linkedTaskIds?: string[];  // Tasks linked to this milestone
}

// Enhanced Task interface
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  module: ModuleType;
  assignees?: TeamMember[];
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
  
  // NEW optional fields (backward compatible)
  milestoneId?: string;      // Link to parent milestone
  moduleId?: string;         // Link to Module entity (in addition to module type)
  linkedIssueIds?: string[]; // Issues affecting this task
}

// Issue entity (New)
export interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  
  // Relationships
  projectId: string;
  moduleId?: string;           // Which module is affected
  blocksTaskIds?: string[];    // Tasks blocked by this issue
  blocksMilestoneIds?: string[]; // Milestones affected
  
  // Ownership
  reportedBy: TeamMember;
  assignedTo?: TeamMember;
  
  // Dates
  reportedAt: string;
  resolvedAt?: string;
  dueDate?: string;
  
  // Additional context
  resolution?: string;         // How it was resolved
  attachments?: Attachment[];
  comments?: Comment[];
  tags?: string[];
}

// Legacy module summary (for backward compatibility)
export interface ModuleSummary {
  type: ModuleType;
  name: string;
  progress: number;
  taskCount: number;
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
  modules: ModuleSummary[];  // Legacy support
  projectModules?: Module[]; // First-class modules (optional for backward compatibility)
  issues?: Issue[];          // Project-level issues (optional for backward compatibility)
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 'comment_added' | 'milestone_reached' | 'status_changed' | 'issue_created' | 'issue_resolved';
  title: string;
  description: string;
  user: TeamMember;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskTitle?: string;
  issueId?: string;
  issueTitle?: string;
  timestamp: string;
}

// View types for the project detail page (legacy - kept for backward compatibility)
export type ProjectView = 'kanban' | 'timeline' | 'list' | 'dependencies' | 'milestones' | 'issues';

// NEW: Section-based navigation for project detail
export type ProjectSection = 'tasks' | 'modules' | 'milestones' | 'issues';
export type TaskViewMode = 'kanban' | 'list';
export type ModuleViewMode = 'kanban' | 'list';

// My Day specific types
export type MyDayView = 'kanban' | 'list';
export type MyDayGroupBy = 'project' | 'progress' | 'dueDate' | 'priority';

// Filter options - enhanced for hardware workflows
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: Priority[];
  module?: ModuleType[];
  assignee?: string[];
  milestoneId?: string;
  dueDate?: 'overdue' | 'today' | 'this-week' | 'this-month' | 'no-date';
  tags?: string[];
  hasBlockers?: boolean;
}

export interface IssueFilter {
  severity?: IssueSeverity[];
  status?: IssueStatus[];
  category?: IssueCategory[];
  assignee?: string[];
  moduleId?: string;
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
