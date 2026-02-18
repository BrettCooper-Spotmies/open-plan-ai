
# Make Reports Page Fully Dynamic (Remove All Mock Data)

## Current State Analysis

The Reports page (`src/features/reports/Reports.tsx`) imports from `@/data/mockData`:
- `projects` — used as the source of tasks, issues, milestones, and for the project filter dropdown
- `teamMembers` — used for the Team Workload chart
- `projectModules` — used for Module Progress chart
- `projectIssues` — standalone issues added on top of project issues

All 6 child components receive data derived from mock objects. The filters (project selector, assignee filter, module filter) all display mock entries.

## Data Type Mismatch Issues to Resolve

Several adapters are needed because the DB types differ from the frontend types used in `reportsUtils.ts`:

| Frontend Type | DB Type | Key differences |
|---|---|---|
| `Milestone` (from types/index.ts) | `Milestone` (from milestones.service.ts = DB row) | DB has `name`, `due_date`, `status`, `progress`; Frontend has `title`, `date`, `completed` |
| `Module` (from types/index.ts) | `Module` (from modules.service.ts = DB row) | DB has `module_type`, `name`; Frontend has `type`, `color`, `owner` |
| `TeamMember` (from types/index.ts) | `TeamMember` (from team.service.ts) | team.service.ts version extends Profile and adds role/department/status |

The `reportsUtils.ts` functions use the **frontend** types. The hooks (`useAllMilestones`, `useAllModules`, `useTeamMembers`) return **DB** types. We need adapter/mapper functions to bridge the gap.

## Plan

### Step 1 — Add `useAllTasks` with org scope and `useAllIssues` with project filter

The existing `useAllTasks()` in `useTasks.ts` calls `tasksService.getAll()` which fetches ALL tasks across all organizations (limited by RLS). When a project filter is active, we need to filter by `projectId`. This is fine — we'll filter client-side in Reports.tsx.

The existing `useAllIssues()` similarly fetches all org-accessible issues. Both already work with RLS so they only return data for the current user's organizations.

### Step 2 — Add org-scoped `useAllModules` hook

The existing `useAllModules()` in `useModules.ts` fetches all modules accessible by the user (scoped via RLS on `project_id → projects.organization_id`). We need an org-scoped version to add to the query key so it re-fetches on org change.

Add `useOrgAllModules(orgId)` to `src/hooks/useModules.ts` that queries modules filtered to the org's project IDs (similar to `useAllMilestones`).

### Step 3 — Adapter Functions for Type Conversion

The `reportsUtils.ts` functions expect **frontend types** (`Milestone`, `Module`), but DB hooks return raw DB rows. We'll add adapter functions directly in `Reports.tsx` (or a new `src/features/reports/utils/adapters.ts`) to convert:

```typescript
// DB milestone row → frontend Milestone for reportsUtils
function dbMilestoneToFrontend(dbM: DbMilestone): Milestone {
  return {
    id: dbM.id,
    title: dbM.name,
    date: dbM.due_date || '',
    completed: dbM.status === 'completed',
    description: dbM.description || undefined,
  };
}

// DB module row → frontend Module for reportsUtils  
function dbModuleToFrontend(dbM: DbModule): Module {
  return {
    id: dbM.id,
    name: dbM.name,
    type: (dbM.module_type as ModuleType) || 'software',
    description: dbM.description || undefined,
    createdAt: dbM.created_at || '',
  };
}

// team.service TeamMember → types/index.ts TeamMember for reportsUtils
function serviceTeamMemberToFrontend(m: ServiceTeamMember): FrontendTeamMember {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    initials: m.initials,
    avatar: m.avatar_url || undefined,
  };
}
```

### Step 4 — Rewrite `Reports.tsx`

Replace all mock data imports with real hooks:

```typescript
// REMOVE:
import { projects, teamMembers, projectModules, projectIssues } from '@/data/mockData';

// ADD:
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import { useAllIssues } from '@/hooks/useIssues';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useOrgAllModules } from '@/hooks/useModules';
import { useTeamMembers } from '@/hooks/useTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
```

**Data flow in the component:**

```
useProjects()        → projects[]           → filter dropdown, project name lookup
useAllTasks()        → tasks[]              → filter by projectId if selected → filteredTasks
useAllIssues()       → issues[]             → filter by projectId if selected
useAllMilestones()   → dbMilestones[]       → adapt → milestones[] for charts
useOrgAllModules()   → dbModules[]          → adapt → modules[] for filter + chart
useTeamMembers(orgId)→ serviceMembers[]     → adapt → teamMembers[] for workload + filter
```

**Filtering tasks/issues by selected project:**
```typescript
const tasks = useMemo(() => {
  if (!filter.projectId) return allTasks;
  return allTasks.filter(t => t.projectId === filter.projectId);
}, [allTasks, filter.projectId]);

const issues = useMemo(() => {
  if (!filter.projectId) return allIssues;
  return allIssues.filter(i => i.projectId === filter.projectId);
}, [allIssues, filter.projectId]);

const milestones = useMemo(() => {
  if (!filter.projectId) return adaptedMilestones;
  return adaptedMilestones.filter(m => /* need projectId on milestone */ ...);
}, [adaptedMilestones, filter.projectId]);
```

**Note on milestone projectId:** The DB milestone has `project_id` but the `useAllMilestones` hook returns raw DB rows. We need to keep the `project_id` field through the adapter for filtering. We'll use a slightly different approach — keep DB milestones as-is and filter them before adapting.

**Issue navigation fix:** The `handleIssueClick` currently searches `projects` (mock) for which project contains the issue. Since issues have `projectId` on them, we can use that directly:
```typescript
const handleIssueClick = useCallback((issueId: string) => {
  const issue = allIssues.find(i => i.id === issueId);
  if (issue?.projectId) {
    navigate(`/projects/${issue.projectId}/issues/${issueId}`);
  }
}, [allIssues, navigate]);
```

**Milestone navigation fix:** The `handleMilestoneClick` needs to find which project a milestone belongs to. We'll look up via `dbMilestones` (which have `project_id`).

### Step 5 — Fix `ReportMilestoneHealth` usage

The `getMilestoneHealth` function in `reportsUtils.ts` references `milestone.date` and `milestone.title` (frontend types). The adapter ensures the DB milestone is converted to have these fields before being passed to `getMilestoneHealth`.

Also, `getMilestoneHealth` checks `milestone.completed` — our adapter maps `status === 'completed'` to `true`.

### Step 6 — Fix `ReportsFilters` to receive dynamic data

The `ReportsFilters` component already accepts `projects`, `teamMembers`, `modules`, `milestones` as props — we just need to pass the real data instead of mock data. The filter will also need the milestones from the selected project (or all if no project selected).

### Step 7 — Add loading state for the entire page

```tsx
const isLoading = projectsLoading || tasksLoading || issuesLoading || milestonesLoading || modulesLoading;

{isLoading ? (
  <div className="space-y-6">
    <Skeleton className="h-32" /> {/* KPI row skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
    </div>
  </div>
) : (
  // actual charts
)}
```

## Files to Modify

| File | Change |
|---|---|
| `src/hooks/useModules.ts` | Add `useOrgAllModules(orgId)` hook scoped to current org's project IDs |
| `src/features/reports/Reports.tsx` | Remove all mock imports, wire up real hooks, add adapters, fix navigation handlers, add loading state |
| `src/features/reports/utils/reportsUtils.ts` | Minor update: `getMilestoneHealth` checks `milestone.completed` — ensure the adapter maps correctly; no functional change needed |

**No database migrations needed.** All data is already in the backend with RLS scoping.

## Edge Cases Handled

- **Empty org (no projects):** All hooks return `[]`, charts show empty states
- **Project filter:** Tasks and issues are filtered by `task.projectId`/`issue.projectId` client-side (already populated since we fixed `mapDbTaskToTask`)
- **Milestone project filter:** Filter DB milestones by `project_id` before adapting to frontend type
- **Module project filter:** Filter DB modules by `project_id` before adapting
- **Team workload with empty tasks:** `getTeamWorkload` already handles `filter(item => item.totalTasks > 0)`
- **Issue click navigation:** Use `issue.projectId` directly instead of searching mock array
