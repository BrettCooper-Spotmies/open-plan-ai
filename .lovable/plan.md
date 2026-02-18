
# Make Calendar Dynamic (Replace Mock Data with Real Backend Data)

## Problem

The Calendar page (`src/features/calendar/Calendar.tsx`) imports and uses `projects` and `teamMembers` from the static mock data file. All calendar events (tasks, milestones, issues) are derived from mock project objects, meaning the calendar shows hardcoded data instead of real database records.

## Root Cause

Three data dependencies are mocked:
1. **Projects list** — used both for event conversion and for the filter UI's project dropdown
2. **Team members** — used only for the filter UI's assignee dropdown
3. **Events** — tasks/milestones/issues are read off mock `project.tasks`, `project.milestones`, `project.issues`

## Solution

Replace all mock imports with real hooks. The existing service layer already supports everything needed — only a missing `useAllMilestones` hook needs to be added.

### Data Flow After Fix

```text
useProjects()           → Project[] scoped to current org  → filter dropdown + event conversion context
useAllTasks()           → Task[]   (all org tasks)          → calendar task events
useAllMilestones()      → Milestone[] (all org milestones)  → calendar milestone events
useAllIssues()          → Issue[]   (all org issues)        → calendar issue events
useOrganizationMembers  → TeamMember[] (org members)        → filter assignee dropdown
```

### How event conversion works

The existing `convertToCalendarEvents()` utility already accepts typed arrays and a projectId/name. After fetching tasks/milestones/issues, we need to group them by `project_id` so each event gets the correct `projectName`. We use the `useProjects()` data to build a `projectId -> projectName` map.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useMilestones.ts` | Add `useAllMilestones(orgId?)` hook that fetches milestones scoped to the current org's projects |
| `src/features/calendar/Calendar.tsx` | Replace mock imports with real hooks; add loading state; use live data for events, filters, and modals |

## Detailed Changes

### 1. `src/hooks/useMilestones.ts` — Add `useAllMilestones`

Add a new hook that:
1. Reads `currentOrganization.id` from `useOrganization()`
2. First fetches the org's project IDs from the projects query cache (or re-fetches)
3. Queries `milestones` filtered by those project IDs
4. Returns `Milestone[]` (the DB type from `milestonesService`)

```typescript
export function useAllMilestones() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: [...queryKeys.milestones.all, 'org', orgId],
    queryFn: async () => {
      // Get project IDs for this org first
      const { data: projectRows } = await supabase
        .from('projects')
        .select('id')
        .eq('organization_id', orgId!)
        .is('deleted_at', null);

      const projectIds = (projectRows || []).map(p => p.id);
      if (!projectIds.length) return [];

      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
}
```

### 2. `src/features/calendar/Calendar.tsx` — Replace mock data

**Remove:**
```typescript
import { projects, teamMembers } from '@/data/mockData';
```

**Add hooks:**
```typescript
import { useProjects } from '@/hooks/useProjects';
import { useAllTasks } from '@/hooks/useTasks';
import { useAllIssues } from '@/hooks/useIssues';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useOrganizationMembers } from '@/hooks/useProjectTeam';
import { useOrganization } from '@/contexts/OrganizationContext';
```

**Inside the component:**
```typescript
const { currentOrganization } = useOrganization();
const { data: projects = [] } = useProjects();
const { data: allTasks = [], isLoading: tasksLoading } = useAllTasks();
const { data: allMilestones = [], isLoading: milestonesLoading } = useAllMilestones();
const { data: allIssues = [], isLoading: issuesLoading } = useAllIssues();
const { data: teamMembers = [] } = useOrganizationMembers(currentOrganization?.id);

const isLoading = tasksLoading || milestonesLoading || issuesLoading;
```

**Event conversion** — group tasks/milestones/issues by project, then convert:
```typescript
const allEvents = useMemo(() => {
  const projectMap = new Map(projects.map(p => [p.id, p.name]));
  const events: CalendarEvent[] = [];

  // Group tasks by project
  const tasksByProject = new Map<string, Task[]>();
  allTasks.forEach(task => {
    // Tasks have a project_id in the DB, but the frontend Task type gets it
    // from context. We need to look it up differently.
    // We iterate tasks and match via task.projectId if available, else we skip
  });
  // ...
}, [projects, allTasks, allMilestones, allIssues]);
```

**Important note on task projectId:** The frontend `Task` type doesn't carry `projectId` — the DB task has `project_id`. The `tasksService.getAll()` method fetches from Supabase but the `mapDbTaskToTask` function doesn't include `project_id` in the returned object.

**Fix needed:** The `tasksService` needs to include `projectId` in the mapped `Task` so we can group by project for calendar events. We'll check the types and add `projectId` to the `Task` type and the mapping function.

Looking at `src/types/index.ts`: The `Task` interface likely doesn't have `projectId`. We need to add it.

Actually — looking more carefully: `convertToCalendarEvents` takes `(tasks, milestones, issues, projectId, projectName)` and processes arrays per-project. Since our hooks return a flat list of all tasks, we need the `project_id` on each task.

**The clean approach:** Extend `mapDbTaskToTask` to include `projectId` from the DB row, and add `projectId?: string` to the `Task` type. Then group tasks/milestones/issues by projectId in the calendar's `useMemo`.

Alternatively, since issues already have `projectId` on the mapped type (see `mapDbIssueToIssue`: `projectId: dbIssue.project_id`), we just need the same for tasks.

**For milestones**, the DB row returned by `useAllMilestones` already has `project_id` as a raw DB column since it returns the DB type directly.

### Summary of all changes:

1. **`src/types/index.ts`** — Add `projectId?: string` to the `Task` interface
2. **`src/services/tasks.service.ts`** — Include `projectId: dbTask.project_id` in `mapDbTaskToTask`
3. **`src/hooks/useMilestones.ts`** — Add `useAllMilestones()` hook
4. **`src/features/calendar/Calendar.tsx`** — Replace all mock data with real hooks, add loading skeleton, update event conversion and modal lookups to use live data

### Modal handling after migration

Currently, clicking an event searches through `projects.tasks/milestones/issues` to find the entity. After the fix:
- **Task modal**: find task directly from `allTasks` array by `event.id`
- **Milestone modal**: find milestone from `allMilestones` by `event.id`
- **Issue modal**: find issue from `allIssues` by `event.id`
- For the modal's `allTasks` prop (needed for dependency view), filter `allTasks` by the same `projectId`

### Loading state

Add a simple loading indicator while data is being fetched:
```tsx
{isLoading && (
  <div className="flex-1 flex items-center justify-center text-muted-foreground">
    Loading calendar data...
  </div>
)}
```
