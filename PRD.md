# OpenPlan AI - Product Requirements Document

## Table of Contents
1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Core Domain Entities](#4-core-domain-entities)
5. [Features & Functionality](#5-features--functionality)
6. [UI/UX Patterns](#6-uiux-patterns)
7. [Data Flow](#7-data-flow)
8. [Routing](#8-routing)
9. [Component Patterns](#9-component-patterns)
10. [Design System](#10-design-system)
11. [Future Considerations](#11-future-considerations)

---

## 1. Overview

### Product Vision
OpenPlan AI is a hardware-native project management platform designed specifically for hardware development teams. Unlike generic project management tools, it understands the unique challenges of hardware product development: physical prototypes, component procurement, compliance testing, and cross-functional dependencies.

### Target Users
- Hardware engineering teams
- Product development managers
- Firmware and embedded software engineers
- Quality assurance teams
- Procurement and supply chain specialists

### Core Value Proposition
- **Entity-centric organization**: Projects organized around domain entities (Tasks, Modules, Milestones, Issues) rather than view types
- **Hardware-aware workflows**: Built-in understanding of hardware development phases
- **Dependency management**: First-class support for complex task dependencies and blockers
- **Module-based architecture**: Organize work by hardware subsystems (PCB, Enclosure, Firmware, etc.)

---

## 2. Tech Stack

### Frontend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI library |
| TypeScript | 5.x | Type safety |
| Vite | 5.x | Build tool & dev server |

### Styling & UI
| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.x | Utility-first CSS |
| shadcn/ui | Latest | Component library (Radix UI based) |
| Lucide React | 0.462.x | Icon library |
| tailwindcss-animate | 1.x | CSS animations |

### State & Data
| Technology | Version | Purpose |
|------------|---------|---------|
| TanStack Query | 5.x | Server state management |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### Navigation & Routing
| Technology | Version | Purpose |
|------------|---------|---------|
| React Router DOM | 6.x | Client-side routing |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| date-fns | 3.x | Date manipulation |
| clsx | 2.x | Conditional classnames |
| tailwind-merge | 2.x | Tailwind class merging |
| class-variance-authority | 0.7.x | Component variants |

### Drag & Drop
| Technology | Version | Purpose |
|------------|---------|---------|
| @hello-pangea/dnd | 18.x | Drag and drop (fork of react-beautiful-dnd) |

### Visualization
| Technology | Version | Purpose |
|------------|---------|---------|
| Recharts | 2.x | Charts and graphs |

### Other
| Technology | Version | Purpose |
|------------|---------|---------|
| sonner | 1.x | Toast notifications |
| vaul | 0.9.x | Drawer component |
| next-themes | 0.3.x | Theme management |
| cmdk | 1.x | Command palette |

---

## 3. Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── project/               # Project-specific components
│   │   ├── KanbanView.tsx     # Task Kanban board
│   │   ├── ListView.tsx       # Task list view
│   │   ├── TasksSection.tsx   # Tasks section wrapper
│   │   ├── TaskDetailModal.tsx
│   │   ├── ModulesSection.tsx # Modules section wrapper
│   │   ├── ModulesKanbanView.tsx
│   │   ├── ModulesListView.tsx
│   │   ├── ModuleDetailModal.tsx
│   │   ├── AddModuleDialog.tsx
│   │   ├── MilestonesView.tsx
│   │   ├── MilestoneDetailModal.tsx
│   │   ├── IssuesView.tsx
│   │   ├── IssueDetailModal.tsx
│   │   ├── TaskFilters.tsx
│   │   └── ...
│   ├── dashboard/             # Dashboard widgets
│   │   ├── ActivityFeed.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── ProjectsOverview.tsx
│   │   └── UpcomingMilestones.tsx
│   ├── layout/                # Layout components
│   │   ├── AppHeader.tsx
│   │   ├── AppLayout.tsx
│   │   └── AppSidebar.tsx
│   └── myday/                 # My Day view components
│       ├── MyDaySection.tsx
│       ├── MyDayKanbanView.tsx
│       ├── MyDayListView.tsx
│       └── ...
├── pages/                     # Route pages
│   ├── Dashboard.tsx
│   ├── MyDay.tsx
│   ├── Projects.tsx
│   ├── ProjectDetail.tsx
│   ├── Settings.tsx
│   ├── Team.tsx
│   └── ...
├── types/                     # TypeScript definitions
│   └── index.ts
├── data/                      # Mock data
│   └── mockData.ts
├── lib/                       # Utility functions
│   ├── utils.ts               # General utilities
│   ├── projectUtils.ts        # Project-specific utilities
│   └── myDayUtils.ts          # My Day utilities
├── hooks/                     # Custom React hooks
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── App.tsx                    # Main app component
├── App.css                    # Global styles
├── index.css                  # Tailwind base + custom CSS variables
└── main.tsx                   # Entry point
```

---

## 4. Core Domain Entities

### 4.1 Project
The top-level container for all project work.

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'planning';
  startDate: string;
  endDate: string;
  owner: TeamMember;
  team: TeamMember[];
  progress: number;           // Derived from tasks
  tags: string[];
  priority: Priority;
}
```

### 4.2 Task
The primary execution unit representing work to be done.

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;         // 'todo' | 'in-progress' | 'review' | 'done' | 'blocked'
  priority: Priority;         // 'low' | 'medium' | 'high' | 'critical'
  module?: ModuleType;        // Legacy: module type
  moduleId?: string;          // Reference to Module entity
  milestoneId?: string;       // Reference to Milestone
  assignees: TeamMember[];
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies: string[];     // Task IDs this depends on
  blockedBy: string[];        // Task IDs blocking this
  linkedIssueIds?: string[];  // Issues affecting this task
  tags: string[];
  checklist?: ChecklistItem[];
  attachments?: Attachment[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';
type Priority = 'low' | 'medium' | 'high' | 'critical';
```

**Status Workflow:**
```
todo → in-progress → review → done
         ↓
      blocked (when dependencies unresolved)
```

### 4.3 Module
Logical or physical subdivisions of the hardware system.

```typescript
interface Module {
  id: string;
  name: string;
  type: ModuleType;
  description?: string;
  color: string;              // Hex color for visual identification
  owner?: TeamMember;
  createdAt: string;
}

type ModuleType = 
  | 'hardware' | 'software' | 'firmware' | 'testing' | 'design'
  | 'procurement' | 'manufacturing' | 'qa' | 'logistics'
  | 'enclosure' | 'pcb' | 'power';
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

### 4.4 Milestone
Time-based checkpoints with progress derived from linked tasks.

```typescript
interface Milestone {
  id: string;
  title: string;
  description?: string;
  date: string;               // Target date
  completed: boolean;
  linkedTaskIds?: string[];   // Tasks contributing to this milestone
  tags?: string[];
}
```

**Milestone Status Derivation:**
- `completed`: Manually marked complete
- `blocked`: Has open blocking issues
- `at-risk`: Less than 7 days remaining AND less than 80% complete
- `on-track`: Default state

### 4.5 Issue
Unplanned problems, risks, and defects that can block work.

```typescript
interface Issue {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  projectId: string;
  moduleId?: string;
  blocksTaskIds?: string[];
  blocksMilestoneIds?: string[];
  reportedBy: TeamMember;
  assignees?: TeamMember[];
  reportedAt: string;
  dueDate?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  tags?: string[];
}

type IssueCategory = 
  | 'defect' | 'risk' | 'supplier' | 'compliance'
  | 'design-change' | 'test-failure' | 'other';

type IssueSeverity = 'critical' | 'major' | 'minor' | 'trivial';

type IssueStatus = 
  | 'open' | 'investigating' | 'in-progress' | 'pending'
  | 'resolved' | 'closed' | 'wont-fix';
```

### 4.6 Team Member

```typescript
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  avatar?: string;
}
```

---

## 5. Features & Functionality

### 5.1 Dashboard
**Route:** `/dashboard`

The central hub displaying:
- **Activity Feed**: Recent project activity
- **Project Overview Cards**: Quick stats for all projects
- **Upcoming Milestones**: Next milestone deadlines
- **Dashboard Stats**: Key metrics and counts

### 5.2 My Day
**Route:** `/my-day`

Personal task view showing:
- Tasks assigned to current user
- **View modes**: Kanban, List
- **Group by options**: Status, Priority, Project, Due Date
- Quick stats (tasks due today, completed today)

### 5.3 Projects List
**Route:** `/projects`

- Grid/List view of all projects
- Status badges, progress indicators
- Quick actions (view, settings)

### 5.4 Project Detail
**Route:** `/projects/:id`

The main project workspace with section-based navigation:

#### Sections (Tabs)
| Section | Description | View Modes |
|---------|-------------|------------|
| **Tasks** | All project tasks | Kanban, List |
| **Modules** | Hardware subsystems | Kanban, List |
| **Milestones** | Time-based checkpoints | Timeline |
| **Issues** | Problems and blockers | List |

#### Tasks Section Features
- **Dependencies Bucket**: First Kanban column showing blocked tasks
- **Filters**: Module, Milestone, Due Date, Status, Tags, Assignee
- **View Toggle**: Switch between Kanban and List

#### Modules Section Features
- **Kanban View**: Cards showing module summary (tasks, progress, issues)
- **List View**: Table with module details
- **Add Module**: Dialog to create new modules
- **Module Detail**: Modal showing full module info and related tasks/issues

#### Milestones Section
- Timeline visualization
- Progress derived from linked tasks
- Issue blocking indicators

#### Issues Section
- Filterable list view
- Severity and status badges
- Blocking relationship indicators

### 5.5 Team
**Route:** `/team`

- Team member list
- Roles and contact info
- Workload indicators (optional)

### 5.6 Settings
**Route:** `/settings`

- User preferences
- Workspace settings
- Notifications

---

## 6. UI/UX Patterns

### 6.1 Modal Patterns

**Standard Modal Structure:**
```tsx
<Dialog>
  <DialogContent className="max-w-3xl max-h-[90vh]">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <ScrollArea>
      {/* Content */}
    </ScrollArea>
    <DialogFooter>
      {/* Actions */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Used for:**
- Task details (`TaskDetailModal`)
- Module details (`ModuleDetailModal`)
- Issue details (`IssueDetailModal`)
- Add/Edit dialogs

### 6.2 View Toggle Pattern

```tsx
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="kanban">
    <LayoutGrid className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="list">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>
```

### 6.3 Filter Pattern

**Filter Dropdown with Active Chips:**
```tsx
<TaskFilters
  filters={filters}
  onFiltersChange={setFilters}
  modules={modules}
  milestones={milestones}
  teamMembers={teamMembers}
/>
```

Displays:
- Filter button with active count badge
- Dropdown with filter options
- Active filter chips below toolbar
- Clear all button

### 6.4 Card Patterns

**Task Card (Kanban):**
- Checkbox for completion
- Title with hover edit
- Priority indicator (colored line)
- Assignee avatar
- Due date (if set)
- Dependency warning icon (if blocked)

**Module Card:**
- Color indicator (left border)
- Name and description
- Task count and progress bar
- Owner avatar
- Issue warning badge (if any)

### 6.5 Status Color Coding

| Status | CSS Variable | Usage |
|--------|--------------|-------|
| To Do | `--status-todo` | Default/pending tasks |
| In Progress | `--status-in-progress` | Active work |
| Review | `--status-review` | Awaiting review |
| Done | `--status-done` | Completed |
| Blocked | `--status-blocked` | Dependency blocked |

### 6.6 Priority Visual Indicators

| Priority | Color | Visual |
|----------|-------|--------|
| Critical | Red | Red left border + badge |
| High | Orange | Orange left border |
| Medium | Yellow | Yellow left border |
| Low | Gray | Subtle left border |

---

## 7. Data Flow

### 7.1 Current State (Mock Data)
Currently uses static mock data from `src/data/mockData.ts`:
- `teamMembers`: Array of team members
- `projectModules`: Array of modules
- `projectIssues`: Array of issues
- `medicalDeviceTasks`: Array of tasks
- `sampleProjects`: Array of projects

### 7.2 State Management Pattern

**Local State for UI:**
```tsx
const [viewMode, setViewMode] = useState<TaskViewMode>('kanban');
const [filters, setFilters] = useState<TaskFilter>({});
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
```

**Derived State with useMemo:**
```tsx
const filteredTasks = useMemo(() => {
  return tasks.filter(task => {
    if (filters.module?.length && !filters.module.includes(task.module)) return false;
    if (filters.status?.length && !filters.status.includes(task.status)) return false;
    // ... more filters
    return true;
  });
}, [tasks, filters]);
```

### 7.3 Update Handlers

**Pattern for updates:**
```tsx
const handleTaskUpdate = (updatedTask: Task) => {
  setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
};

const handleModuleAdd = (newModule: Omit<Module, 'id' | 'createdAt'>) => {
  const module: Module = {
    ...newModule,
    id: `mod-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  setModules(prev => [...prev, module]);
};
```

---

## 8. Routing

### Route Structure

```tsx
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  
  {/* Protected routes with layout */}
  <Route element={<AppLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/my-day" element={<MyDay />} />
    <Route path="/projects" element={<Projects />} />
    <Route path="/projects/new" element={<NewProject />} />
    <Route path="/projects/:id" element={<ProjectDetail />} />
    <Route path="/projects/:id/issues/:issueId" element={<IssuePage />} />
    <Route path="/team" element={<Team />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

### URL Patterns

| Pattern | Page | Description |
|---------|------|-------------|
| `/` | Index | Landing/redirect |
| `/dashboard` | Dashboard | Main dashboard |
| `/my-day` | My Day | Personal task view |
| `/projects` | Projects | Project list |
| `/projects/new` | New Project | Create project |
| `/projects/:id` | Project Detail | Project workspace |
| `/projects/:id/issues/:issueId` | Issue Page | Full issue view |
| `/team` | Team | Team management |
| `/settings` | Settings | User/workspace settings |

---

## 9. Component Patterns

### 9.1 shadcn/ui Usage

Import from `@/components/ui/*`:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

### 9.2 Component Props Interface

```tsx
interface TaskCardProps {
  task: Task;
  onComplete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  showModule?: boolean;
}
```

### 9.3 Conditional Styling with cn()

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "base-styles",
  condition && "conditional-styles",
  variant === 'primary' && "primary-styles"
)} />
```

### 9.4 Icon Usage

```tsx
import { CheckCircle2, AlertTriangle, LayoutGrid, List } from 'lucide-react';

<CheckCircle2 className="h-4 w-4 text-status-done" />
```

---

## 10. Design System

### 10.1 Color Tokens (index.css)

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
}
```

### 10.2 Spacing Scale

Follow Tailwind's spacing scale:
- `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px)
- `p-2`, `p-4`, `p-6` for padding
- `my-2`, `my-4` for vertical margins

### 10.3 Typography

```css
/* Headings */
.text-xl font-semibold     /* Dialog titles */
.text-lg font-medium       /* Section headers */
.text-sm                   /* Body text */
.text-xs text-muted-foreground /* Labels, metadata */
```

### 10.4 Border Radius

- `rounded-lg` for cards, dialogs
- `rounded-md` for buttons, inputs
- `rounded-full` for avatars, color indicators

---

## 11. Future Considerations

### 11.1 Backend Integration
- Lovable Cloud / Supabase for database
- Real-time subscriptions for live updates
- Row Level Security for access control

### 11.2 Authentication
- Email/password authentication
- OAuth providers (Google, GitHub)
- Role-based access control

### 11.3 Real-time Features
- Live task updates across users
- Collaborative editing
- Activity notifications

### 11.4 File Storage
- Attachment uploads to Supabase Storage
- Image preview and management

### 11.5 Advanced Features
- Time tracking integration
- BOM (Bill of Materials) management
- Compliance documentation
- Reporting and analytics dashboard
- Export to CSV/PDF
- API for external integrations

### 11.6 Mobile Optimization
- Responsive design improvements
- PWA capabilities
- Native app consideration

---

## Appendix A: Type Definitions Reference

See `src/types/index.ts` for complete TypeScript definitions.

## Appendix B: Utility Functions

See `src/lib/projectUtils.ts` for project-related utilities:
- `getMilestoneProgress()` - Calculate milestone completion
- `getModuleTasks()` - Get tasks for a module
- `getModuleProgress()` - Calculate module progress
- `getBlockingIssues()` - Get issues blocking a task
- `getModuleColor()` - Get color for module type
- `formatModuleType()` - Format module type for display

---

*Document Version: 1.0*
*Last Updated: January 2026*
