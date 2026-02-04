
# Fix Dependency and Progress Features

## Summary
Three issues need to be addressed:

1. **"Blocking To" and "Blocked By" show same tasks after refresh** - The data model fix made both fields populate from the same source, but semantically they should show different things
2. **"Blocked By" tasks don't appear in Dependencies bucket** - The Kanban's Dependencies bucket relies on `blockedBy` to identify blocked tasks, but the current data model is flawed
3. **Project progress calculation and popover** - Progress should be an average of modules, milestones, tasks, and issues, with a hover popover showing the breakdown

## Root Cause Analysis

### Issue 1 & 2: Dependency Data Model Problem

The recent fix changed both `dependencies` and `blockedBy` to populate from the same `task_dependencies` data:
```typescript
dependencies: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
```

This creates a conceptual problem:
- **"Blocking To"** (dependencies): Tasks that THIS task is blocking (i.e., tasks that depend on this task)
- **"Blocked By"** (blockedBy): Tasks that are blocking THIS task (i.e., tasks this task depends on)

These are **inverse relationships**. The fix incorrectly made them identical.

**Correct Semantics:**
- `task_dependencies` table: `(task_id, depends_on_id)` means "task_id depends on depends_on_id"
- For Task A viewing its modal:
  - **"Blocked By"**: Query where `task_id = A` to get `depends_on_id` values (tasks A depends on)
  - **"Blocking To"**: Query where `depends_on_id = A` to get `task_id` values (tasks that depend on A)

The current query fetches `task_dependencies!task_dependencies_task_id_fkey(depends_on_id)` which gets tasks THIS task depends on.

We need a **separate query** to get tasks that depend on this task (for "Blocking To").

### Issue 3: Project Progress Calculation

Currently, `project.progress` is stored as a simple integer in the database and is not calculated dynamically. The user wants:
- Progress = average of (Module progress + Milestone progress + Task completion + Issue resolution)
- A popover on hover showing the breakdown

---

## Solution

### Phase 1: Fix Dependency Data Model

**Problem**: `dependencies` (Blocking To) and `blockedBy` are currently identical.

**Solution**: 
- `blockedBy` = tasks this task depends on (already correct from `task_dependencies` where `task_id = this`)
- `dependencies` (Blocking To) = tasks that depend on this task (needs separate query)

**However**, looking at the current DB query structure, the Supabase client doesn't easily support inverse relationship queries in the same request. 

**Alternative approach - Client-side computation**:
Instead of trying to fetch both directions from the DB, compute "Blocking To" client-side by looking at all tasks and finding which ones have this task in their `blockedBy`:

```typescript
// In TaskDetailModal or a utility
const getBlockingToTasks = (currentTaskId: string, allTasks: Task[]) => {
  return allTasks.filter(task => task.blockedBy.includes(currentTaskId));
};
```

This requires:
1. Keep `blockedBy` populated correctly from DB (tasks this task depends on)
2. Compute `dependencies` (Blocking To) client-side from `allTasks`
3. Update the service layer to only persist to `task_dependencies` when `blockedBy` changes

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/tasks.service.ts` | Revert `dependencies` mapping to compute separately; update persistence logic |
| `src/services/projects.service.ts` | Same mapping fix |
| `src/features/projects/components/TaskDetailModal.tsx` | Compute "Blocking To" from allTasks client-side |
| `src/features/projects/components/KanbanView.tsx` | Ensure blockedTaskIds uses correct blockedBy data |

### Detailed Changes

#### 1. Fix Data Mapping (`tasks.service.ts` and `projects.service.ts`)

**Current (incorrect):**
```typescript
dependencies: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
```

**Correct:**
```typescript
// blockedBy = tasks this task depends on (from task_dependencies where task_id = this task)
blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
// dependencies (Blocking To) needs to be computed client-side from allTasks
// Initialize as empty array - will be computed in component
dependencies: [],
```

#### 2. Compute "Blocking To" in TaskDetailModal

The TaskDetailModal already receives `allTasks`. Add a computed value:

```typescript
// Compute "Blocking To" - tasks that have THIS task in their blockedBy
const blockingToTaskIds = useMemo(() => {
  return allTasks
    .filter(task => task.blockedBy.includes(editedTask.id))
    .map(task => task.id);
}, [allTasks, editedTask.id]);
```

Use `blockingToTaskIds` for the "Blocking To" section instead of `editedTask.dependencies`.

#### 3. Update Persistence Logic

When user adds to "Blocking To" (this task blocks another):
- We need to add THIS task to the OTHER task's `blockedBy`
- This means updating the dependent task, not the current task

When user adds to "Blocked By" (this task is blocked by another):
- Add to current task's `blockedBy` (persisted via `task_dependencies`)

```typescript
// Adding to "Blocking To" - update the OTHER task
const handleAddBlockingTask = () => {
  if (!selectedBlockingTask) return;
  // Find the task we're adding as a "blocking to"
  const taskToUpdate = allTasks.find(t => t.id === selectedBlockingTask);
  if (taskToUpdate) {
    // Add current task to that task's blockedBy
    const updatedBlockedBy = [...taskToUpdate.blockedBy, editedTask.id];
    onUpdate({ ...taskToUpdate, blockedBy: updatedBlockedBy });
  }
};

// Adding to "Blocked By" - update THIS task
const handleAddBlockedByTask = () => {
  if (!selectedBlockedByTask) return;
  handleFieldChange('blockedBy', [...editedTask.blockedBy, selectedBlockedByTask]);
};
```

#### 4. Service Layer Update

Simplify the update to only handle `blockedBy`:

```typescript
// Update blockedBy (task dependencies where this task depends on others)
if (updates.blockedBy !== undefined) {
  await supabase.from('task_dependencies').delete().eq('task_id', taskId);
  if (updates.blockedBy.length > 0) {
    const dependencyInserts = updates.blockedBy.map(depId => ({
      task_id: taskId,
      depends_on_id: depId
    }));
    await supabase.from('task_dependencies').insert(dependencyInserts);
  }
}
```

---

### Phase 2: Project Progress with Popover

#### 1. Calculate Composite Progress

Create a utility function to calculate project progress:

```typescript
// src/features/projects/utils/projectUtils.ts

interface ProgressBreakdown {
  moduleProgress: number;
  milestoneProgress: number;
  taskProgress: number;
  issueProgress: number;
  overallProgress: number;
}

export function calculateProjectProgress(
  tasks: Task[],
  milestones: Milestone[],
  modules: Module[],
  issues: Issue[]
): ProgressBreakdown {
  // Task progress: % of tasks completed
  const taskProgress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
    : 0;

  // Milestone progress: % of milestones completed
  const milestoneProgress = milestones.length > 0
    ? Math.round((milestones.filter(m => m.completed).length / milestones.length) * 100)
    : 0;

  // Module progress: average of all module progresses (from DB or computed)
  const moduleProgress = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + (m.progress || 0), 0) / modules.length)
    : 0;

  // Issue progress: % of issues resolved/closed
  const resolvedIssues = issues.filter(i => 
    i.status === 'resolved' || i.status === 'closed'
  ).length;
  const issueProgress = issues.length > 0
    ? Math.round((resolvedIssues / issues.length) * 100)
    : 100; // 100% if no issues

  // Overall: average of all four
  const overallProgress = Math.round(
    (taskProgress + milestoneProgress + moduleProgress + issueProgress) / 4
  );

  return {
    moduleProgress,
    milestoneProgress,
    taskProgress,
    issueProgress,
    overallProgress,
  };
}
```

#### 2. Create Progress Popover Component

Create a new component for the progress display with hover popover:

```typescript
// src/features/projects/components/ProjectProgressPopover.tsx

import { Progress } from '@/components/ui/progress';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Boxes, Flag, ListTodo, AlertTriangle } from 'lucide-react';

interface ProgressBreakdown {
  moduleProgress: number;
  milestoneProgress: number;
  taskProgress: number;
  issueProgress: number;
  overallProgress: number;
}

interface ProjectProgressPopoverProps {
  breakdown: ProgressBreakdown;
}

export function ProjectProgressPopover({ breakdown }: ProjectProgressPopoverProps) {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-help">
          <Progress value={breakdown.overallProgress} className="w-24 h-2" />
          <span className="text-sm font-medium">{breakdown.overallProgress}%</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64" align="start">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Progress Breakdown</h4>
          
          {/* Modules */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Boxes className="h-3 w-3" />
                Modules
              </span>
              <span className="font-medium">{breakdown.moduleProgress}%</span>
            </div>
            <Progress value={breakdown.moduleProgress} className="h-1.5" />
          </div>

          {/* Milestones */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Flag className="h-3 w-3" />
                Milestones
              </span>
              <span className="font-medium">{breakdown.milestoneProgress}%</span>
            </div>
            <Progress value={breakdown.milestoneProgress} className="h-1.5" />
          </div>

          {/* Tasks */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ListTodo className="h-3 w-3" />
                Tasks
              </span>
              <span className="font-medium">{breakdown.taskProgress}%</span>
            </div>
            <Progress value={breakdown.taskProgress} className="h-1.5" />
          </div>

          {/* Issues */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                Issues Resolved
              </span>
              <span className="font-medium">{breakdown.issueProgress}%</span>
            </div>
            <Progress value={breakdown.issueProgress} className="h-1.5" />
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
```

#### 3. Update ProjectDetail.tsx

Use the new progress calculation and popover:

```typescript
// In ProjectDetail.tsx

import { calculateProjectProgress } from './utils/projectUtils';
import { ProjectProgressPopover } from './components/ProjectProgressPopover';

// Inside component:
const progressBreakdown = useMemo(() => {
  return calculateProjectProgress(
    project?.tasks || [],
    project?.milestones || [],
    modules,
    project?.issues || []
  );
}, [project?.tasks, project?.milestones, modules, project?.issues]);

// In JSX, replace the progress display:
<ProjectProgressPopover breakdown={progressBreakdown} />
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| `src/services/tasks.service.ts` | Fix mapping - `blockedBy` from DB, `dependencies` empty; update persistence for `blockedBy` only |
| `src/services/projects.service.ts` | Same mapping fix |
| `src/features/projects/components/TaskDetailModal.tsx` | Compute "Blocking To" client-side; fix add/remove handlers for both directions |
| `src/features/projects/utils/projectUtils.ts` | Add `calculateProjectProgress()` function |
| `src/features/projects/components/ProjectProgressPopover.tsx` | New component for progress with hover breakdown |
| `src/features/projects/ProjectDetail.tsx` | Use new progress calculation and popover component |

## Technical Notes

- The "Blocking To" relationship requires updating the OTHER task's `blockedBy`, which means the `onUpdate` callback in TaskDetailModal needs to support updating any task, not just the currently viewed one
- The Dependencies bucket in KanbanView will work correctly once `blockedBy` is properly populated (it already checks `task.blockedBy`)
- Progress breakdown uses equal weighting (25% each) for simplicity; this could be made configurable later

