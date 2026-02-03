
# Fix Task Dependency Persistence Issues

## Summary
Two bugs exist in the task dependency feature:
1. **Dependencies lost on refresh**: When adding "Blocking" or "Blocked By" tasks in the Task Detail Modal, they appear in the UI but are lost after page refresh
2. **Dependencies bucket is empty**: The Kanban board's "Dependencies" column shows no tasks even when dependencies exist

## Root Cause Analysis

### Database Schema Understanding
The `task_dependencies` table has this structure:
- `task_id`: The task that has a dependency
- `depends_on_id`: The task it depends on

This means: "Task A depends on Task B" is stored as `(task_id=A, depends_on_id=B)`

### Current Mapping in Code
When fetching tasks, the service layer maps:
- `dependencies` = tasks that THIS task depends on (fetched via `task_dependencies_task_id_fkey`)
- `blockedBy` = tasks that are blocking THIS task (fetched via `task_dependencies_depends_on_id_fkey`)

The query correctly fetches both directions:
```sql
task_dependencies!task_dependencies_task_id_fkey(depends_on_id),  -- dependencies
blocked_by:task_dependencies!task_dependencies_depends_on_id_fkey(task_id)  -- blockedBy
```

### The Bug - Missing Persistence for `blockedBy`
In `tasksService.update()`, only `updates.dependencies` is persisted (lines 346-355). **The `updates.blockedBy` field is completely ignored.**

When a user adds Task B to Task A's "Blocked By" list:
1. UI updates local state correctly
2. `onUpdate` is called with `{ blockedBy: [taskB.id] }`
3. Service layer ignores `blockedBy` - nothing is written to the database
4. On refresh, `blockedBy` is fetched from DB (which is empty) - dependencies are lost

### Additional Issue - Conceptual Relationship
When Task A is "blocked by" Task B, it means Task A depends on Task B completing first. So adding Task B to Task A's `blockedBy` should actually insert:
- `task_id = A, depends_on_id = B` (A depends on B)

This is actually the **same** as adding Task B to Task A's `dependencies` list! The difference is semantic:
- `dependencies`: "This task depends on these tasks" (forward view)
- `blockedBy`: "This task is blocked by these tasks" (same relationship, different perspective)

### Why Dependencies Bucket is Empty
The `KanbanView` component uses `blockedTaskIds` to populate the Dependencies column:
```typescript
const blockedTaskIds = useMemo(() => {
  tasks.forEach(task => {
    if (task.blockedBy && task.blockedBy.length > 0) {
      const hasUnresolvedBlocker = task.blockedBy.some(blockerId => {
        const blocker = allTasksToCheck.find(t => t.id === blockerId);
        return blocker && blocker.status !== 'done';
      });
      if (hasUnresolvedBlocker) blocked.add(task.id);
    }
  });
});
```

Since `blockedBy` is never persisted and comes back empty after refresh, no tasks are identified as blocked.

## Solution

### Fix 1: Persist `blockedBy` in Task Service (Primary Fix)
Update `tasksService.update()` to handle `updates.blockedBy`. When `blockedBy` is updated, we need to:
1. Delete existing dependency records where this task depends on other tasks (related to blockedBy)
2. Insert new records for each blocking task

Since `blockedBy` is conceptually the same as `dependencies` (both mean "this task depends on that task"), we have two options:

**Option A - Merge `blockedBy` into `dependencies`**: 
Treat `blockedBy` and `dependencies` as the same thing when persisting. The difference is only semantic in the UI.

**Option B - Track separately**:
Create logic to handle `blockedBy` updates by inserting the corresponding `task_dependencies` rows.

**Recommended: Option B** - Keep the update logic clear. When `blockedBy` changes, update the `task_dependencies` table with the new dependencies (where current task depends on the blocking tasks).

### Implementation Details

**File: `src/services/tasks.service.ts`**

Add handling for `blockedBy` in the `update()` method, after the `dependencies` handling block:

```typescript
// Update blockedBy if provided
// blockedBy means "this task is blocked BY these tasks" = "this task depends on these tasks"
// We need to insert records where task_id = current task, depends_on_id = blocker task
if (updates.blockedBy !== undefined) {
  // First, get current dependencies to avoid duplicates
  const currentDeps = updates.dependencies !== undefined 
    ? updates.dependencies 
    : (await this.getById(taskId))?.dependencies || [];
  
  // The blockedBy entries should be added to dependencies (same relationship)
  const allDependencies = [...new Set([...currentDeps, ...updates.blockedBy])];
  
  // Delete and re-insert all dependencies
  await supabase.from('task_dependencies').delete().eq('task_id', taskId);
  if (allDependencies.length > 0) {
    const dependencyInserts = allDependencies.map(depId => ({
      task_id: taskId,
      depends_on_id: depId
    }));
    await supabase.from('task_dependencies').insert(dependencyInserts);
  }
}
```

However, this approach has a problem: if `dependencies` and `blockedBy` are updated independently, we might lose data. 

**Better Approach**: Handle `blockedBy` BEFORE `dependencies` and merge them:

1. When updating, check if EITHER `dependencies` or `blockedBy` changed
2. If either changed, merge them together (removing duplicates)
3. Persist the merged set to `task_dependencies`
4. On fetch, the two arrays will be populated correctly from the inverse relationship

Actually, looking more carefully at the data model, there's a conceptual issue:
- `dependencies` = "I depend on these tasks" (stored as `task_id=me, depends_on_id=them`)
- `blockedBy` = "I am blocked by these tasks" = "I depend on these tasks" (same thing!)

So `dependencies` and `blockedBy` are the **same relationship stored once**. The UI should:
- Show `dependencies` as "This task depends on..."
- Show `blockedBy` by looking up which tasks this one depends on

Wait, let me re-read the fetch logic:
```sql
task_dependencies!task_dependencies_task_id_fkey(depends_on_id) -- Gets depends_on_id WHERE task_id = this task
blocked_by:task_dependencies!task_dependencies_depends_on_id_fkey(task_id) -- Gets task_id WHERE depends_on_id = this task
```

So:
- `dependencies` = tasks this task depends on (I depend on them)
- `blockedBy` = tasks that depend on THIS task (they depend on me, so I block them)

This is the INVERSE! Let me reconsider:
- If Task A's `blockedBy` contains Task B, it means Task B is in Task A's blockedBy list
- The query fetches: `WHERE depends_on_id = A` and returns `task_id` values
- This means Task B has a record `(task_id=B, depends_on_id=A)` - Task B depends on A
- So Task A is blocking Task B, not the other way around!

**This is a data model bug in the query alias!**

The correct semantics should be:
- `blockedBy` = "Tasks that block me" = "Tasks I depend on" = same as `dependencies`

But the current query returns "Tasks that I block" (the inverse).

### Corrected Understanding

Looking at the TypeScript types:
```typescript
dependencies: string[]; // Task IDs this task depends on
blockedBy: string[]; // Task IDs blocking this task
```

These should be the SAME thing semantically. If Task A depends on Task B, then Task B is blocking Task A.

The current fetch query maps:
- `dependencies` = `depends_on_id` values where `task_id = this_task`  (tasks I depend on)
- `blockedBy` = `task_id` values where `depends_on_id = this_task` (tasks that depend on me = tasks I block)

**The query alias is wrong!** `blockedBy` should show tasks that block me, but it's currently showing tasks that I block.

### Final Solution

There are two sub-issues:

**A. The `blocked_by` query alias is inverted** (secondary issue for future fix)
The current query returns tasks that depend on the current task, not tasks that the current task depends on. For a task to be "blocked by" another task, the current task should depend on that task.

For now, we should recognize that in the current implementation:
- `dependencies` and `blockedBy` represent the SAME relationship from the user's perspective
- When a user adds to `blockedBy`, they mean "this task depends on that task"

**B. `blockedBy` is not persisted** (the primary bug)

When the user adds a task to `blockedBy`, we should add that task to the `dependencies` since they're conceptually the same.

## Changes

### File: `src/services/tasks.service.ts`

**Change 1**: Add `blockedBy` handling in the `update()` method

After the `dependencies` handling block (around line 355), add logic to handle `blockedBy`:

```typescript
// Update blockedBy if provided
// In our data model, blockedBy means "tasks that block this task" = "tasks this task depends on"
// So we need to ADD these to the dependencies
if (updates.blockedBy !== undefined) {
  // Get current dependencies (either from updates or fetch current)
  let currentDependencies: string[] = [];
  if (updates.dependencies !== undefined) {
    currentDependencies = updates.dependencies;
  } else {
    // Fetch current dependencies from DB
    const { data: currentDeps } = await supabase
      .from('task_dependencies')
      .select('depends_on_id')
      .eq('task_id', taskId);
    currentDependencies = (currentDeps || []).map(d => d.depends_on_id);
  }
  
  // Merge blockedBy into dependencies (they represent the same relationship)
  const mergedDependencies = [...new Set([...currentDependencies, ...updates.blockedBy])];
  
  // Clear and re-insert all dependencies
  await supabase.from('task_dependencies').delete().eq('task_id', taskId);
  if (mergedDependencies.length > 0) {
    const dependencyInserts = mergedDependencies.map(depId => ({
      task_id: taskId,
      depends_on_id: depId
    }));
    await supabase.from('task_dependencies').insert(dependencyInserts);
  }
}
```

**Wait - there's still an issue.** The UI treats `dependencies` and `blockedBy` as separate lists. If we merge them on save, the UI will show duplicates.

Let me reconsider the UX:
- User adds Task B to Task A's "Blocking" list (dependencies)
- User adds Task C to Task A's "Blocked By" list
- Both mean Task A depends on B and C
- They should be stored as dependencies of A

The real fix needs to:
1. Handle BOTH fields when persisting
2. Ensure the fetch correctly populates both (or just one, and derive the other)

**Revised approach - Simplify the model:**

Since `blockedBy` and `dependencies` represent the same relationship in the database, we should:
1. Only persist `dependencies` (which already works)
2. Make the UI update `dependencies` when the user modifies `blockedBy`

OR

1. Fix the query so `blockedBy` returns the same data as `dependencies` (since they're the same)
2. In the UI, when user adds to `blockedBy`, also add to `dependencies`
3. Deduplicate when saving

**Simplest fix:**

In `TaskDetailModal.tsx`, when the user adds to `blockedBy`, also add to `dependencies`:

```typescript
const handleAddBlockedByTask = () => {
  if (!selectedBlockedByTask) return;
  // Add to blockedBy for UI display
  const newBlockedBy = [...editedTask.blockedBy, selectedBlockedByTask];
  // Also add to dependencies for persistence (they're the same relationship)
  const newDependencies = [...new Set([...editedTask.dependencies, selectedBlockedByTask])];
  
  const updated = { 
    ...editedTask, 
    blockedBy: newBlockedBy,
    dependencies: newDependencies,
    updatedAt: new Date().toISOString() 
  };
  setEditedTask(updated);
  onUpdate(updated);
};
```

And similarly for removal.

But this still has issues because:
1. On refresh, `dependencies` is populated correctly but `blockedBy` still uses the wrong query
2. The UI will show duplicates

**The cleanest solution is to fix the query and consolidate the fields.**

## Final Recommended Solution

### Phase 1: Fix Persistence (Immediate)

Update `tasksService.update()` to handle `blockedBy`:
- When `blockedBy` is updated, persist it as additional dependencies
- Merge with existing/updated dependencies to avoid duplicates

### Phase 2: Fix Query Mapping (Secondary)  

The `blocked_by` alias should be removed or renamed since it's confusing. The `blockedBy` field on the frontend should be computed from `dependencies` on the UI side if needed, or we accept that `dependencies` is the single source of truth.

For now, let's implement Phase 1 with a simpler approach:

**In `tasksService.update()`**, handle `blockedBy` by treating it as additional dependencies:

```typescript
// Handle blockedBy - these are tasks that block the current task
// In our model, this means the current task depends on them
if (updates.blockedBy !== undefined) {
  // Get existing dependencies
  const existingDeps = updates.dependencies ?? [];
  
  // Merge blockedBy into dependencies
  const mergedDeps = [...new Set([...existingDeps, ...updates.blockedBy])];
  
  // If dependencies wasn't explicitly being updated, we need to handle it now
  if (updates.dependencies === undefined) {
    // Delete existing and insert merged
    await supabase.from('task_dependencies').delete().eq('task_id', taskId);
    if (mergedDeps.length > 0) {
      const dependencyInserts = mergedDeps.map(depId => ({
        task_id: taskId,
        depends_on_id: depId
      }));
      await supabase.from('task_dependencies').insert(dependencyInserts);
    }
  }
  // If dependencies was also updated, they'll be handled together above
}
```

Actually this gets complex. Let me simplify:

## Simplified Solution

The issue is that when `handleFieldChange('blockedBy', ...)` is called, the service only persists the task table fields and `dependencies`, ignoring `blockedBy`.

### Fix the service layer to persist blockedBy as dependencies

**File: `src/services/tasks.service.ts`** - Lines 345-355

Modify the dependencies update block to also include blockedBy:

```typescript
// Update dependencies if provided (including blockedBy which represents the same relationship)
if (updates.dependencies !== undefined || updates.blockedBy !== undefined) {
  // Merge dependencies and blockedBy (they represent the same database relationship)
  const allDependencies = [
    ...(updates.dependencies || []),
    ...(updates.blockedBy || [])
  ];
  const uniqueDependencies = [...new Set(allDependencies)];
  
  await supabase.from('task_dependencies').delete().eq('task_id', taskId);
  if (uniqueDependencies.length > 0) {
    const dependencyInserts = uniqueDependencies.map(depId => ({
      task_id: taskId,
      depends_on_id: depId
    }));
    await supabase.from('task_dependencies').insert(dependencyInserts);
  }
}
```

### Fix the fetch query to correctly populate blockedBy

The current query:
```sql
blocked_by:task_dependencies!task_dependencies_depends_on_id_fkey(task_id)
```

This returns tasks where `depends_on_id = current_task`, meaning "tasks that depend on me" (I block them).

But `blockedBy` should be "tasks that block me" = "tasks I depend on" = same as `dependencies`.

**Fix**: Just use `dependencies` to populate both fields, or remove `blockedBy` from the fetch and compute it in the UI.

For simplicity, let's populate `blockedBy` from the same data as `dependencies`:

**In `mapDbTaskToTask` function:**

```typescript
const dependencies = (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id);
return {
  // ...
  dependencies: dependencies,
  blockedBy: dependencies, // Same data - tasks I depend on = tasks that block me
  // ...
};
```

This means in the UI, `dependencies` and `blockedBy` will always be identical, which might not be the intended UX. If the intent was to have two separate lists that can be edited independently, that's a different data model.

Given the current schema (single `task_dependencies` table), the cleanest approach is:
1. Keep only `dependencies` in the data model
2. Remove `blockedBy` from the UI or make it read-only (derived from dependencies)

But to minimize UI changes, let's:
1. Fix persistence to save both fields to the same table
2. On fetch, populate both from the same data
3. In the UI, when adding to either field, we add to dependencies (since that's what gets persisted correctly now after our fix)

## Implementation Plan

| File | Changes |
|------|---------|
| `src/services/tasks.service.ts` | Modify update() to handle blockedBy, fix mapDbTaskToTask |
| `src/services/projects.service.ts` | Fix mapDbTaskToTask to use dependencies for blockedBy |

### Detailed Code Changes

**src/services/tasks.service.ts - mapDbTaskToTask (lines 41-66)**

Change line 58 to populate blockedBy from dependencies:
```typescript
dependencies: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id), // Same as dependencies
```

**src/services/tasks.service.ts - update() method (lines 345-355)**

Replace the dependencies handling with combined logic:
```typescript
// Update dependencies if provided (blockedBy represents the same relationship)
if (updates.dependencies !== undefined || updates.blockedBy !== undefined) {
  // Merge both arrays - they represent the same DB relationship
  const currentTask = await this.getById(taskId);
  const existingDeps = currentTask?.dependencies || [];
  
  const newDependencies = updates.dependencies !== undefined ? updates.dependencies : existingDeps;
  const newBlockedBy = updates.blockedBy !== undefined ? updates.blockedBy : [];
  
  // Combine and deduplicate
  const allDependencies = [...new Set([...newDependencies, ...newBlockedBy])];
  
  await supabase.from('task_dependencies').delete().eq('task_id', taskId);
  if (allDependencies.length > 0) {
    const dependencyInserts = allDependencies.map(depId => ({
      task_id: taskId,
      depends_on_id: depId
    }));
    await supabase.from('task_dependencies').insert(dependencyInserts);
  }
}
```

**src/services/projects.service.ts - mapDbTaskToTask (lines 40-66)**

Same change to line 57:
```typescript
dependencies: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id),
blockedBy: (dbTask.task_dependencies || []).map((d: any) => d.depends_on_id), // Same as dependencies
```
