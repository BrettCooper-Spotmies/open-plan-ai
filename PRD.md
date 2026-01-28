# OpenPlan AI - Product Requirements Document (PRD)

> **Version:** 2.0  
> **Last Updated:** January 2026  
> **Project Status:** 75% Complete - Production Capable

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Target Users](#2-product-vision--target-users)
3. [Tech Stack](#3-tech-stack)
4. [Project Architecture](#4-project-architecture)
5. [Core Domain Entities](#5-core-domain-entities)
6. [Features & Functionality](#6-features--functionality)
7. [State Management](#7-state-management)
8. [Routing & Navigation](#8-routing--navigation)
9. [UI/UX Patterns](#9-uiux-patterns)
10. [Design System](#10-design-system)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Testing Infrastructure](#12-testing-infrastructure)
13. [API & Services Layer](#13-api--services-layer)
14. [Business Logic Reference](#14-business-logic-reference)
15. [Development Guidelines](#15-development-guidelines)
16. [Future Roadmap](#16-future-roadmap)

---

## 1. Executive Summary

### What is OpenPlan AI?

OpenPlan AI is a **hardware-native project management platform** designed specifically for hardware development teams. Unlike generic project management tools (Jira, Asana, Trello), it understands the unique challenges of hardware product development:

- Physical prototypes and component dependencies
- Component procurement and vendor management
- Compliance testing and regulatory requirements
- Cross-functional team dependencies (mechanical, electrical, firmware, QA)
- Bill of Materials (BOM) tracking
- Manufacturing transitions

### Current Project Status

| Phase | Completion | Description |
|-------|------------|-------------|
| Foundation | 100% | State management, services, error handling |
| Architecture | 85% | Feature-based structure, 7 modules |
| Testing | 95% | 257 tests, 99.6% pass rate |
| Performance | 80% | Virtual scrolling, web workers, memoization |
| Polish | 60% | Documentation, CI/CD setup needed |

**Overall: 75% Complete (B+ Grade)**

---

## 2. Product Vision & Target Users

### Target Users

| User Type | Primary Use Case |
|-----------|------------------|
| **Hardware Engineers** | Track PCB design, enclosure, power system tasks |
| **Product Managers** | Monitor milestones, track dependencies, manage risks |
| **Firmware Engineers** | Link firmware tasks to hardware modules |
| **QA Teams** | Log issues, track test failures, compliance gaps |
| **Procurement Specialists** | Manage supplier issues, component sourcing |
| **Manufacturing Teams** | Production tracking, assembly tasks |

### Core Value Propositions

1. **Module-Based Organization** - Work organized by hardware subsystems (PCB, Enclosure, Firmware, Power)
2. **Dependency Management** - First-class support for task blockers and dependencies
3. **Issue Tracking** - Hardware-specific issue categories (defect, supplier, compliance, test-failure)
4. **Cross-Functional Views** - My Day, Calendar, Reports spanning all projects
5. **Real-Time Status** - Visual indicators for blocked, at-risk, on-track status

---

## 3. Tech Stack

### Frontend Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI library |
| TypeScript | 5.8.x | Type safety |
| Vite | 5.4.x | Build tool & dev server |
| React Router DOM | 6.30.x | Client-side routing |

### Styling & UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4.x | Utility-first CSS |
| shadcn/ui | Latest | Component library (Radix UI) |
| Lucide React | 0.462.x | Icon library |
| tailwindcss-animate | 1.x | CSS animations |
| class-variance-authority | 0.7.x | Component variants |

### State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 5.x | Global state management |
| TanStack React Query | 5.x | Server state & caching |
| Immer | 11.x | Immutable state updates |

### Forms & Validation

| Technology | Version | Purpose |
|------------|---------|---------|
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### Data Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| Recharts | 2.x | Charts and graphs |
| @hello-pangea/dnd | 18.x | Drag and drop (Kanban) |

### Performance

| Technology | Version | Purpose |
|------------|---------|---------|
| @tanstack/react-virtual | 3.x | Virtual scrolling |
| Web Workers | Native | Background calculations |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| date-fns | 3.x | Date manipulation |
| Axios | 1.x | HTTP client |
| clsx + tailwind-merge | 2.x | Conditional classnames |

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.x | Test runner |
| React Testing Library | 16.x | Component testing |
| jsdom | 27.x | DOM environment |

### Development Tooling

| Technology | Version | Purpose |
|------------|---------|---------|
| ESLint | 9.x | Linting |
| Husky | 9.x | Git hooks |
| lint-staged | 16.x | Pre-commit linting |

---

## 4. Project Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  Features   │ │  Components │ │     Layout (Header,     ││
│  │  (Pages)    │ │  (Shared)   │ │     Sidebar)            ││
│  └──────┬──────┘ └──────┬──────┘ └───────────┬─────────────┘│
└─────────┼───────────────┼────────────────────┼──────────────┘
          │               │                    │
          ▼               ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     State Layer                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   Zustand   │ │ React Query │ │     Local State         ││
│  │   Stores    │ │   Cache     │ │     (useState)          ││
│  └──────┬──────┘ └──────┬──────┘ └─────────────────────────┘│
└─────────┼───────────────┼───────────────────────────────────┘
          │               │
          ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │   API       │ │   Services  │ │     Monitoring          ││
│  │   Client    │ │  (Business) │ │     (Logger)            ││
│  └──────┬──────┘ └──────┬──────┘ └─────────────────────────┘│
└─────────┼───────────────┼───────────────────────────────────┘
          │               │
          ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐│
│  │  REST API   │ │  Mock Data  │ │     Local Storage       ││
│  │  (Backend)  │ │  (Dev)      │ │     (Preferences)       ││
│  └─────────────┘ └─────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # Entry point
├── index.css                  # Global styles + CSS variables
│
├── features/                  # Feature modules (domain-driven)
│   ├── dashboard/             # Dashboard & stats (6 files)
│   ├── projects/              # Project management (27 files)
│   │   ├── Projects.tsx       # Projects list page
│   │   ├── ProjectDetail.tsx  # Project workspace
│   │   ├── NewProject.tsx     # Create project page
│   │   ├── IssuePage.tsx      # Issue detail page
│   │   ├── components/        # 19 project-specific components
│   │   └── utils/             # Project utilities
│   ├── myday/                 # Daily task focus (9 files)
│   ├── calendar/              # Calendar views (10 files)
│   ├── reports/               # Analytics & reporting (14 files)
│   ├── settings/              # User preferences (2 files)
│   └── team/                  # Team management (2 files)
│
├── components/                # Shared components
│   ├── ui/                    # shadcn/ui primitives (50+ files)
│   ├── layout/                # AppHeader, AppSidebar, AppLayout
│   ├── ErrorBoundary.tsx      # Error handling
│   ├── SuspenseFallback.tsx   # Loading states
│   └── NavLink.tsx            # Navigation helper
│
├── stores/                    # Zustand global state
│   ├── useProjectStore.ts     # Project & task state
│   ├── useFilterStore.ts      # Filter preferences
│   └── useUserStore.ts        # User state
│
├── services/                  # Business logic & API
│   ├── api/
│   │   ├── client.ts          # Axios instance
│   │   └── endpoints.ts       # API route constants
│   ├── monitoring/
│   │   └── logger.ts          # Logging service
│   ├── projects.service.ts    # Project CRUD operations
│   ├── tasks.service.ts       # Task CRUD operations
│   └── issues.service.ts      # Issue CRUD operations
│
├── hooks/                     # Custom React hooks
│   ├── useProjects.ts         # React Query project hook
│   ├── useTasks.ts            # React Query tasks hook
│   ├── useIssues.ts           # React Query issues hook
│   ├── useVirtualList.ts      # Virtual scrolling hook
│   ├── useReportWorker.ts     # Web worker hook
│   ├── use-mobile.tsx         # Mobile detection
│   └── use-toast.ts           # Toast notifications
│
├── workers/                   # Web Workers (background processing)
│   └── reportCalculations.worker.ts
│
├── types/                     # TypeScript definitions
│   └── index.ts               # All shared types
│
├── lib/                       # Utilities
│   ├── utils.ts               # cn(), formatDate, etc.
│   └── queryClient.ts         # React Query configuration
│
├── config/                    # Environment configuration
│   └── index.ts               # API URL, feature flags
│
├── data/                      # Mock data (development)
│   └── mockData.ts            # Sample projects, tasks, team
│
├── pages/                     # Auth pages (not lazy loaded)
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── ForgotPassword.tsx
│   ├── NotFound.tsx
│   └── Index.tsx
│
└── test/                      # Test utilities
    ├── setup.ts               # Vitest setup
    └── utils.tsx              # Test helpers
```

---

## 5. Core Domain Entities

### 5.1 Project

The top-level container for all project work.

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  stage: ProjectStage;        // 'concept' | 'design' | 'development' | 'testing' | 'production'
  progress: number;           // 0-100, derived from tasks
  startDate: string;
  targetDate: string;
  team: TeamMember[];
  tasks: Task[];
  milestones: Milestone[];
  modules: ModuleSummary[];   // Legacy: quick stats per module type
  projectModules?: Module[];  // First-class module entities
  issues?: Issue[];           // Project-level issues
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 Task

The primary work unit with full traceability.

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;         // 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'
  priority: Priority;         // 'low' | 'medium' | 'high' | 'critical'
  module: ModuleType;         // Hardware subsystem type
  moduleId?: string;          // Link to Module entity
  milestoneId?: string;       // Link to parent Milestone
  linkedIssueIds?: string[];  // Issues affecting this task
  assignees?: TeamMember[];
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];     // Task IDs this depends on (MUST complete first)
  blockedBy: string[];        // Task IDs actively blocking this
  tags: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
  createdBy?: TeamMember;
}

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

**Task Status Workflow:**
```
todo → in-progress → review → done
         ↓
      blocked (when dependencies unresolved or issues block)
```

### 5.3 Module

Logical/physical hardware subsystems.

```typescript
interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description?: string;
  color?: string;             // Hex color for visual distinction
  owner?: TeamMember;         // Module lead
  createdAt: string;
  createdBy?: TeamMember;
}

type ModuleType =
  | 'hardware'       // General hardware
  | 'software'       // Software components
  | 'firmware'       // Embedded firmware
  | 'testing'        // Test development
  | 'design'         // CAD, mechanical design
  | 'procurement'    // Sourcing, vendor management
  | 'manufacturing'  // Assembly, production
  | 'qa'             // Quality assurance
  | 'logistics'      // Shipping, inventory
  | 'enclosure'      // Housing, packaging
  | 'pcb'            // PCB design & layout
  | 'power';         // Power systems
```

**Module Color Mapping:**

| Type | Color | Hex |
|------|-------|-----|
| PCB | Blue | #3B82F6 |
| Enclosure | Green | #10B981 |
| Firmware | Purple | #8B5CF6 |
| Procurement | Amber | #F59E0B |
| Software | Pink | #EC4899 |
| QA | Red | #EF4444 |
| Hardware | Sky | #0EA5E9 |
| Design | Cyan | #06B6D4 |
| Manufacturing | Emerald | #22C55E |
| Testing | Orange | #F97316 |
| Logistics | Slate | #64748B |
| Power | Violet | #A855F7 |

### 5.4 Milestone

Time-based checkpoints with progress derived from linked tasks.

```typescript
interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: string;               // Target date
  completed: boolean;
  completedAt?: string;       // Actual completion date
  linkedTaskIds?: string[];   // Tasks contributing to this milestone
  linkedModuleIds?: string[]; // Modules linked to this milestone
  createdBy?: TeamMember;
}
```

**Milestone Status Derivation Logic:**
- `completed`: Manually marked complete
- `blocked`: Has open blocking issues
- `at-risk`: Less than 7 days remaining AND less than 80% complete
- `on-track`: Default state

### 5.5 Issue

Unplanned problems, risks, and defects that can block work.

```typescript
interface Issue {
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
  assignees?: TeamMember[];

  // Dates
  reportedAt: string;
  resolvedAt?: string;
  dueDate?: string;

  // Additional context
  resolution?: string;         // How it was resolved
  attachments?: Attachment[];
  comments?: Comment[];
  tags?: string[];
  checklist?: ChecklistItem[];
}

type IssueCategory =
  | 'defect'         // Product defect found
  | 'risk'           // Identified project risk
  | 'supplier'       // Supplier/vendor issue
  | 'compliance'     // Regulatory/compliance gap
  | 'test-failure'   // Test failure
  | 'design-change'  // Design change request
  | 'other';

type IssueSeverity = 'critical' | 'major' | 'minor' | 'trivial';

type IssueStatus = 
  | 'open'           // Newly reported
  | 'investigating'  // Being investigated
  | 'in-progress'    // Fix in progress
  | 'pending'        // Waiting on something
  | 'resolved'       // Fixed but not verified
  | 'closed'         // Verified and closed
  | 'wont-fix';      // Will not be addressed
```

### 5.6 Team Member

```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;               // e.g., 'Hardware Engineer', 'Project Manager'
  avatar?: string;            // URL to avatar image
  initials: string;           // e.g., 'JD' for John Doe
}

// Extended for team management
interface ExtendedTeamMember extends TeamMember {
  status: MemberStatus;       // 'active' | 'inactive' | 'pending'
  department?: string;
  joinedAt?: string;
  projectCount?: number;
}
```

### 5.7 Activity

Audit trail of project changes.

```typescript
interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'task_updated' | 
        'comment_added' | 'milestone_reached' | 'status_changed' |
        'issue_created' | 'issue_resolved';
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
```

---

## 6. Features & Functionality

### 6.1 Dashboard (`/`)

**Main hub showing:**
- Activity Feed (recent project activity)
- Project Overview Cards (quick stats for all projects)
- Upcoming Milestones (next deadline reminders)
- Dashboard Stats (key metrics: active projects, overdue tasks, etc.)

**Components:** `DashboardStats`, `ProjectsOverview`, `UpcomingMilestones`, `ActivityFeed`

### 6.2 My Day (`/my-day`)

**Personal task view showing:**
- Tasks assigned to current user across all projects
- View modes: Kanban, List
- Group by: Status, Priority, Project, Due Date
- Quick stats (due today, completed today, overdue)

**Key Logic:**
```typescript
// Filter tasks for current user
const myTasks = tasks.filter(task => 
  task.assignees?.some(a => a.id === currentUser.id)
);

// Group by options
type MyDayGroupBy = 'project' | 'progress' | 'dueDate' | 'priority';
```

### 6.3 Calendar (`/calendar`)

**Unified calendar view:**
- Month, Week, Day views
- Shows tasks, milestones, and issues with due dates
- Color-coded by type and priority
- Filters: project, assignee, status, priority

**Entity Types on Calendar:**
```typescript
type CalendarEntityType = 'task' | 'milestone' | 'issue';
```

### 6.4 Projects List (`/projects`)

**Project portfolio view:**
- Grid or List layout
- Status badges (active, on-hold, completed, planning)
- Progress indicators
- Quick actions (view, settings)

### 6.5 Project Detail (`/projects/:id`)

**Main project workspace with section-based tabs:**

| Section | Description | View Modes |
|---------|-------------|------------|
| **Tasks** | All project tasks | Kanban, List |
| **Modules** | Hardware subsystems | Kanban, List |
| **Milestones** | Time-based checkpoints | Timeline |
| **Issues** | Problems and blockers | List |

**Tasks Section Features:**
- Kanban board with columns: To Do, In Progress, Review, Done
- **Dependencies Bucket**: First Kanban column showing blocked tasks
- Drag-and-drop task reordering
- Filters: Module, Milestone, Status, Priority, Due Date, Tags, Assignee
- View Toggle: Kanban ↔ List

**Modules Section Features:**
- Cards showing module summary (task count, progress, issues)
- Add Module dialog
- Module Detail modal with related tasks/issues

**Milestones Section:**
- Timeline visualization
- Progress derived from linked tasks (% completed)
- Issue blocking indicators

**Issues Section:**
- Filterable list
- Severity and status badges
- Relationship indicators (blocks tasks, affects milestones)

### 6.6 New Project (`/projects/new`)

**Project creation form:**
- Name, description, dates
- Initial team selection
- Template selection (optional)

### 6.7 Issue Page (`/projects/:projectId/issues/:issueId`)

**Full issue detail view:**
- Rich description
- Attachments
- Comments
- Linked tasks and milestones
- Status/severity editing

### 6.8 Team (`/team`)

**Team management:**
- Team member list with roles
- Status indicators (active, inactive, pending)
- Workload overview
- Add/invite members

### 6.9 Settings (`/settings`)

**Tabs:**
- **General**: Workspace name, timezone, date format, organization logo
- **Profile**: User avatar, display name, email
- **Notifications**: Email preferences, notification types
- **Appearance**: Theme (light/dark/system)

```typescript
interface UserSettings {
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
```

### 6.10 Reports (`/reports`)

**Analytics & KPIs:**
- Overview cards (completion rate, velocity, etc.)
- Charts: Task distribution, progress over time, team workload
- Export options

---

## 7. State Management

### 7.1 Zustand Stores

**useProjectStore (`stores/useProjectStore.ts`):**
```typescript
interface ProjectState {
  // Data
  projects: Project[];
  selectedProject: Project | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Task operations
  addTask: (projectId: string, task: Task) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;
}
```

**useFilterStore (`stores/useFilterStore.ts`):**
```typescript
interface FilterState {
  taskFilters: TaskFilter;
  issueFilters: IssueFilter;
  calendarFilters: CalendarFilter;
  
  setTaskFilters: (filters: TaskFilter) => void;
  clearTaskFilters: () => void;
  setIssueFilters: (filters: IssueFilter) => void;
  // ...
}
```

**useUserStore (`stores/useUserStore.ts`):**
```typescript
interface UserState {
  currentUser: TeamMember | null;
  settings: UserSettings;
  
  setCurrentUser: (user: TeamMember | null) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}
```

### 7.2 React Query Hooks

**useProjects (`hooks/useProjects.ts`):**
```typescript
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
```

**useTasks (`hooks/useTasks.ts`):**
```typescript
export function useTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksService.getByProject(projectId),
    enabled: !!projectId,
  });
}
```

**useIssues (`hooks/useIssues.ts`):**
```typescript
export function useIssues(projectId: string) {
  return useQuery({
    queryKey: ['issues', projectId],
    queryFn: () => issuesService.getByProject(projectId),
    enabled: !!projectId,
  });
}
```

### 7.3 State Usage Pattern

```typescript
// Component usage
function ProjectDetail() {
  // Server state via React Query
  const { data: project, isLoading } = useProject(projectId);
  
  // Global UI state via Zustand
  const { taskFilters, setTaskFilters } = useFilterStore();
  
  // Local UI state
  const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Derived state
  const filteredTasks = useMemo(() => {
    if (!project?.tasks) return [];
    return project.tasks.filter(task => applyFilters(task, taskFilters));
  }, [project?.tasks, taskFilters]);
}
```

---

## 8. Routing & Navigation

### Route Structure

```typescript
<Routes>
  {/* Auth pages - Eagerly loaded */}
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  
  {/* Feature pages - Lazy loaded with Suspense */}
  <Route path="/" element={<Suspense><Dashboard /></Suspense>} />
  <Route path="/my-day" element={<Suspense><MyDay /></Suspense>} />
  <Route path="/calendar" element={<Suspense><Calendar /></Suspense>} />
  <Route path="/projects" element={<Suspense><Projects /></Suspense>} />
  <Route path="/projects/new" element={<Suspense><NewProject /></Suspense>} />
  <Route path="/projects/:id" element={<Suspense><ProjectDetail /></Suspense>} />
  <Route path="/projects/:projectId/issues/:issueId" element={<Suspense><IssuePage /></Suspense>} />
  <Route path="/team" element={<Suspense><Team /></Suspense>} />
  <Route path="/settings" element={<Suspense><Settings /></Suspense>} />
  <Route path="/reports" element={<Suspense><Reports /></Suspense>} />
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

### URL Patterns

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Main dashboard with stats |
| `/my-day` | My Day | Personal task list |
| `/calendar` | Calendar | Calendar view |
| `/projects` | Projects | All projects list |
| `/projects/new` | New Project | Create project |
| `/projects/:id` | Project Detail | Project workspace |
| `/projects/:projectId/issues/:issueId` | Issue Page | Full issue view |
| `/team` | Team | Team management |
| `/settings` | Settings | User/workspace settings |
| `/reports` | Reports | Analytics dashboard |
| `/login` | Login | Authentication |
| `/signup` | Signup | Registration |
| `/forgot-password` | Forgot Password | Password recovery |

---

## 9. UI/UX Patterns

### 9.1 Modal Pattern

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-3xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <ScrollArea>
      {/* Content */}
    </ScrollArea>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 9.2 View Toggle Pattern

```tsx
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="kanban" aria-label="Kanban view">
    <LayoutGrid className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="list" aria-label="List view">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

### 9.3 Filter Pattern

```tsx
<TaskFilters
  filters={filters}
  onFiltersChange={setFilters}
  modules={projectModules}
  milestones={projectMilestones}
  teamMembers={team}
/>

// Shows:
// - Filter button with active count badge
// - Dropdown with filter options per category
// - Active filter chips below toolbar
// - Clear all button
```

### 9.4 Card Patterns

**Task Card (Kanban):**
- Checkbox for quick completion
- Title with click to open detail
- Priority indicator (colored left border)
- Assignee avatar(s)
- Due date (with color coding if overdue)
- Dependency/blocker warning icon

**Module Card:**
- Color indicator (left border matching module type)
- Name and description
- Task count and progress bar
- Owner avatar
- Issue warning badge (if blocking issues exist)

### 9.5 Status Color Coding

| Status | CSS Variable | Usage |
|--------|--------------|-------|
| To Do | `--status-todo` | Gray, default/pending |
| In Progress | `--status-in-progress` | Blue, active work |
| Review | `--status-review` | Purple, awaiting review |
| Done | `--status-done` | Green, completed |
| Blocked | `--status-blocked` | Red, dependency blocked |

### 9.6 Priority Visual Indicators

| Priority | Color | Visual |
|----------|-------|--------|
| Critical | Red | Red left border + badge |
| High | Orange | Orange left border |
| Medium | Yellow | Yellow left border |
| Low | Gray | Subtle left border |

---

## 10. Design System

### 10.1 Color Tokens (CSS Variables)

```css
:root {
  /* Base colors */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* Semantic colors */
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  
  /* Status colors */
  --status-todo: 220 13% 60%;
  --status-in-progress: 217 91% 60%;
  --status-review: 262 83% 58%;
  --status-done: 142 71% 45%;
  --status-blocked: 0 72% 51%;
  
  /* Priority colors */
  --priority-low: 220 13% 60%;
  --priority-medium: 38 92% 50%;
  --priority-high: 25 95% 53%;
  --priority-critical: 0 72% 51%;

  /* Border and radius */
  --border: 214.3 31.8% 91.4%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark mode overrides */
}
```

### 10.2 Spacing Scale (Tailwind)

- `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)
- `p-2`, `p-4`, `p-6` for padding
- `my-2`, `my-4` for vertical margins

### 10.3 Typography

```css
.text-2xl.font-bold    /* Page titles */
.text-xl.font-semibold /* Dialog titles */
.text-lg.font-medium   /* Section headers */
.text-sm               /* Body text */
.text-xs.text-muted-foreground /* Labels, metadata */
```

### 10.4 Border Radius

- `rounded-lg` for cards, dialogs
- `rounded-md` for buttons, inputs
- `rounded-full` for avatars, color indicators

### 10.5 Component Usage

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
```

---

## 11. Performance Optimizations

### 11.1 Code Splitting

All feature routes are lazy-loaded:
```typescript
const Dashboard = lazy(() => import('./features/dashboard'));
const Projects = lazy(() => import('./features/projects'));
// Results in ~70% bundle size reduction on initial load
```

### 11.2 Virtual Scrolling

Large lists use `@tanstack/react-virtual`:
```typescript
const { virtualItems, totalSize } = useVirtualList({
  count: items.length,
  getItemHeight: () => 60,
  overscan: 5,
});
// Handles 1000+ items smoothly
```

### 11.3 Memoization

```typescript
// Component memoization
export const TaskCard = memo(function TaskCard({ task, ...props }) {
  // ...
});

// Callback memoization
const handleTaskUpdate = useCallback((task: Task) => {
  updateTask(projectId, task.id, task);
}, [projectId, updateTask]);

// Expensive calculations
const filteredTasks = useMemo(() => {
  return tasks.filter(task => applyFilters(task, filters));
}, [tasks, filters]);
```

### 11.4 Web Workers

Heavy calculations offloaded to workers:
```typescript
// hooks/useReportWorker.ts
const { calculateKPIs, isCalculating } = useReportWorker();

// Usage
const kpis = await calculateKPIs(tasks);
// Runs in background, doesn't block UI
```

### 11.5 React Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,       // 30 minutes cache
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});
```

---

## 12. Testing Infrastructure

### 12.1 Test Statistics

- **Test Files:** 12
- **Total Tests:** 257
- **Pass Rate:** 99.6%
- **Execution Time:** ~5.7s
- **Coverage:** ~65%

### 12.2 Test Structure

```
src/
├── services/__tests__/          # Service tests (50+ tests)
│   ├── projects.service.test.ts
│   ├── tasks.service.test.ts
│   └── issues.service.test.ts
├── stores/__tests__/            # Store tests (80+ tests)
│   ├── useProjectStore.test.ts
│   ├── useFilterStore.test.ts
│   └── useUserStore.test.ts
├── features/
│   └── reports/__tests__/       # Feature tests (50+ tests)
│       └── reportsUtils.test.ts
└── test/
    ├── setup.ts                 # Vitest configuration
    └── utils.tsx                # Test utilities
```

### 12.3 Running Tests

```bash
npm test           # Run all tests once
npm run test:watch # Run in watch mode
npm run test:coverage # Run with coverage report
```

### 12.4 Test Patterns

```typescript
// Service test
describe('TasksService', () => {
  it('should create a task with generated id', async () => {
    const task = await tasksService.create(projectId, taskData);
    expect(task.id).toBeDefined();
    expect(task.title).toBe(taskData.title);
  });
});

// Store test
describe('useProjectStore', () => {
  it('should update task status', () => {
    const { updateTask } = useProjectStore.getState();
    updateTask(projectId, taskId, { status: 'done' });
    
    const task = useProjectStore.getState().projects
      .find(p => p.id === projectId)?.tasks
      .find(t => t.id === taskId);
    expect(task?.status).toBe('done');
  });
});

// Component test
describe('TaskCard', () => {
  it('calls onComplete when checkbox clicked', async () => {
    const onComplete = vi.fn();
    render(<TaskCard task={mockTask} onComplete={onComplete} />);
    
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith(mockTask.id);
  });
});
```

---

## 13. API & Services Layer

### 13.1 Service Architecture

```
services/
├── api/
│   ├── client.ts          # Axios instance with interceptors
│   └── endpoints.ts       # API route constants
├── monitoring/
│   └── logger.ts          # Centralized logging
├── projects.service.ts    # Project CRUD
├── tasks.service.ts       # Task CRUD
└── issues.service.ts      # Issue CRUD
```

### 13.2 API Client

```typescript
// services/api/client.ts
const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (error handling)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    logger.error('API Error', { 
      endpoint: error.config?.url,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
);
```

### 13.3 Service Pattern

```typescript
// services/projects.service.ts
export const projectsService = {
  getAll: async (): Promise<Project[]> => {
    if (config.features.useMockData) {
      return mockProjects; // Return mock data in dev
    }
    const response = await apiClient.get('/projects');
    return response.data;
  },

  getById: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`);
    return response.data;
  },

  create: async (data: CreateProjectDTO): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.patch(`/projects/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
};
```

### 13.4 Logger Service

```typescript
// services/monitoring/logger.ts
export const logger = {
  info: (message: string, context?: object) => {
    console.log(`[INFO] ${message}`, context);
  },
  
  warn: (message: string, context?: object) => {
    console.warn(`[WARN] ${message}`, context);
  },
  
  error: (message: string, context?: object) => {
    console.error(`[ERROR] ${message}`, context);
    // In production: send to error tracking service
  },
  
  startPerformance: (label: string) => {
    performance.mark(`${label}-start`);
  },
  
  endPerformance: (label: string) => {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
  },
};
```

---

## 14. Business Logic Reference

### 14.1 Task Filtering

```typescript
// lib/projectUtils.ts
export function applyTaskFilters(tasks: Task[], filters: TaskFilter): Task[] {
  return tasks.filter(task => {
    // Module filter
    if (filters.module?.length && !filters.module.includes(task.module)) {
      return false;
    }
    
    // Status filter
    if (filters.status?.length && !filters.status.includes(task.status)) {
      return false;
    }
    
    // Priority filter
    if (filters.priority?.length && !filters.priority.includes(task.priority)) {
      return false;
    }
    
    // Assignee filter
    if (filters.assignee?.length) {
      const hasAssignee = task.assignees?.some(a => filters.assignee!.includes(a.id));
      if (!hasAssignee) return false;
    }
    
    // Due date filter
    if (filters.dueDate) {
      const today = startOfToday();
      const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
      
      switch (filters.dueDate) {
        case 'overdue':
          if (!dueDate || !isBefore(dueDate, today)) return false;
          break;
        case 'today':
          if (!dueDate || !isToday(dueDate)) return false;
          break;
        case 'this-week':
          if (!dueDate || !isThisWeek(dueDate)) return false;
          break;
        case 'no-date':
          if (dueDate) return false;
          break;
      }
    }
    
    // Has blockers filter
    if (filters.hasBlockers && task.blockedBy.length === 0) {
      return false;
    }
    
    return true;
  });
}
```

### 14.2 Progress Calculations

```typescript
// Milestone progress
export function getMilestoneProgress(milestone: Milestone, tasks: Task[]): number {
  if (!milestone.linkedTaskIds?.length) return 0;
  
  const linkedTasks = tasks.filter(t => milestone.linkedTaskIds!.includes(t.id));
  if (linkedTasks.length === 0) return 0;
  
  const completedTasks = linkedTasks.filter(t => t.status === 'done');
  return Math.round((completedTasks.length / linkedTasks.length) * 100);
}

// Module progress
export function getModuleProgress(module: Module, tasks: Task[]): number {
  const moduleTasks = tasks.filter(t => t.moduleId === module.id || t.module === module.type);
  if (moduleTasks.length === 0) return 0;
  
  const completedTasks = moduleTasks.filter(t => t.status === 'done');
  return Math.round((completedTasks.length / moduleTasks.length) * 100);
}

// Project progress
export function getProjectProgress(project: Project): number {
  if (project.tasks.length === 0) return 0;
  
  const completedTasks = project.tasks.filter(t => t.status === 'done');
  return Math.round((completedTasks.length / project.tasks.length) * 100);
}
```

### 14.3 Blocking Issue Detection

```typescript
export function getBlockingIssues(taskId: string, issues: Issue[]): Issue[] {
  return issues.filter(issue => 
    issue.status !== 'resolved' && 
    issue.status !== 'closed' &&
    issue.blocksTaskIds?.includes(taskId)
  );
}

export function isTaskBlocked(task: Task, tasks: Task[], issues: Issue[]): boolean {
  // Blocked by dependency tasks not done
  const hasPendingDependencies = task.dependencies.some(depId => {
    const depTask = tasks.find(t => t.id === depId);
    return depTask && depTask.status !== 'done';
  });
  
  // Blocked by issues
  const hasBlockingIssues = getBlockingIssues(task.id, issues).length > 0;
  
  return hasPendingDependencies || hasBlockingIssues;
}
```

### 14.4 Module Color/Formatting

```typescript
export function getModuleColor(type: ModuleType): string {
  const colors: Record<ModuleType, string> = {
    pcb: '#3B82F6',
    enclosure: '#10B981',
    firmware: '#8B5CF6',
    procurement: '#F59E0B',
    software: '#EC4899',
    qa: '#EF4444',
    hardware: '#0EA5E9',
    design: '#06B6D4',
    manufacturing: '#22C55E',
    testing: '#F97316',
    logistics: '#64748B',
    power: '#A855F7',
  };
  return colors[type] || '#6B7280';
}

export function formatModuleType(type: ModuleType): string {
  const labels: Record<ModuleType, string> = {
    pcb: 'PCB',
    enclosure: 'Enclosure',
    firmware: 'Firmware',
    procurement: 'Procurement',
    software: 'Software',
    qa: 'Quality Assurance',
    hardware: 'Hardware',
    design: 'Design',
    manufacturing: 'Manufacturing',
    testing: 'Testing',
    logistics: 'Logistics',
    power: 'Power Systems',
  };
  return labels[type] || type;
}
```

---

## 15. Development Guidelines

### 15.1 File Naming Conventions

- **Components:** PascalCase (`TaskCard.tsx`)
- **Hooks:** camelCase with `use` prefix (`useProjects.ts`)
- **Utilities:** camelCase (`projectUtils.ts`)
- **Types:** camelCase (`index.ts`)
- **Tests:** same name with `.test.ts` suffix (`useProjectStore.test.ts`)

### 15.2 Import Aliases

```typescript
// Configured in tsconfig.json
import { Button } from '@/components/ui/button';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';
import { Project, Task } from '@/types';
```

### 15.3 Component Pattern

```typescript
interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  showModule?: boolean;
}

export const TaskCard = memo(function TaskCard({
  task,
  onComplete,
  onClick,
  showModule = true,
}: TaskCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  return (
    <Card className={cn("cursor-pointer", task.priority === 'critical' && "border-red-500")}>
      {/* ... */}
    </Card>
  );
});
```

### 15.4 Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 16. Future Roadmap

### 16.1 Backend Integration
- Supabase for database and auth
- Real-time subscriptions for live updates
- Row Level Security for access control

### 16.2 Authentication (Not Yet Implemented)
- Email/password authentication
- OAuth providers (Google, GitHub, Microsoft)
- Role-based access control (Admin, Manager, Member, Viewer)

### 16.3 Real-Time Features
- Live task updates across users
- Collaborative editing
- Activity notifications (in-app, email, push)

### 16.4 File Storage
- Attachment uploads to cloud storage
- Image preview and thumbnails
- Version history

### 16.5 Advanced Features
- Time tracking integration
- BOM (Bill of Materials) management with cost tracking
- Compliance documentation templates
- Advanced reporting with export to CSV/PDF
- External API for integrations
- Gantt chart view
- Resource allocation views

### 16.6 Mobile Support
- Responsive design improvements (in progress)
- PWA capabilities
- Native mobile app consideration

---

## Appendices

### Appendix A: Full Type Definitions

See `src/types/index.ts` for complete TypeScript definitions.

### Appendix B: Utility Functions Reference

See `src/lib/projectUtils.ts` for:
- `getMilestoneProgress()` - Calculate milestone completion
- `getModuleTasks()` - Get tasks for a module
- `getModuleProgress()` - Calculate module progress
- `getBlockingIssues()` - Get issues blocking a task
- `getModuleColor()` - Get color for module type
- `formatModuleType()` - Format module type for display

### Appendix C: Environment Variables

```env
# .env.example
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true
VITE_ENABLE_DEVTOOLS=true
```

### Appendix D: Project Status Reports

Detailed audit reports available in `.agent/`:
- `PHASE_1_AUDIT_REPORT.md` - Foundation (100%)
- `PHASE_2_UPDATED_STATUS.md` - Architecture (85%)
- `PHASE_3_AUDIT_REPORT.md` - Testing (95%)
- `PHASE_4_AUDIT_REPORT.md` - Performance (80%)
- `PHASE_5_AUDIT_REPORT.md` - Polish (60%)
- `FINAL_PROJECT_STATUS.md` - Complete overview

---

*Document Version: 2.0*  
*Last Updated: January 2026*
