# Fix Build Errors and Add Sticky Kanban Column Headers

## Summary

This plan addresses:

1. **Build errors**: The `Profile` interface in `AuthContext.tsx` is missing `role` and `bio` fields that exist in the database and are used in `TaskDetailModal.tsx` and `Settings.tsx`
2. **Sticky column headers with scrollable task cards**: Make the Kanban board columns have sticky headers that pin to the top when scrolling, while task cards within each column scroll vertically

---

## Changes

### 1. Fix Build Errors - Add missing fields to Profile interface

**File: `src/contexts/AuthContext.tsx**` (lines 6-12)

Add `role` and `bio` to the `Profile` interface and update the profile fetch query to include them:

```typescript
interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  initials: string;
  role: string | null;
  bio: string | null;
}
```

Also update the profile fetching query in the same file to select `role` and `bio` columns.

### 2. Sticky Column Headers with Scrollable Tasks

The current layout chain is:

- `AppLayout` > `main` (`flex-1 overflow-y-auto`) -- this is the page scroll container
- `ProjectDetail` > `Tabs` > `TasksSection` > `KanbanView`
- `KanbanView` columns: each column is a `div` with a sticky header (already has `sticky top-0`) and a task list below

**Problem**: The `sticky top-0` on column headers currently sticks relative to the nearest scroll container, which is the `main` tag in `AppLayout`. But the columns don't have a fixed height with overflow, so there's nothing to scroll within -- the entire page scrolls instead.

**Solution**: Give each Kanban column a fixed height (using `calc(100vh - offset)`) with `overflow-y-auto` on the task list area, and keep the column header sticky at the top. This way:

- Column headers remain visible at the top of each column
- Task cards scroll vertically within each column
- The overall page doesn't need to scroll for the Kanban content

**File: `src/features/projects/components/KanbanView.tsx**`

Change the column container (around line 438-443) to use a flex column layout with constrained height:

```typescript
// Column wrapper - use flex column with max height
<div
  ref={provided.innerRef}
  {...provided.draggableProps}
  className={cn(
    'w-[280px] flex-shrink-0 flex flex-col transition-shadow',
    'max-h-[calc(100vh-220px)]', // Constrain height to viewport minus header/tabs
    snapshot.isDragging && 'shadow-lg'
  )}
>
  {/* Column Header - stays at top (no longer needs sticky, it's naturally at top of flex column) */}
  <div className="flex-shrink-0 bg-background pb-3 space-y-3">
    ...header content unchanged...
  </div>

  {/* Tasks Droppable - scrollable area */}
  <div className="flex-1 overflow-y-auto min-h-0">
    <Droppable ...>
      ...task cards unchanged...
    </Droppable>
  </div>
</div>
```

Key changes:

- Column wrapper: add `flex flex-col` and `max-h-[calc(100vh-220px)]` to constrain height
- Column header: change from `sticky top-0` to `flex-shrink-0` (it stays at top naturally as part of flex layout)
- Task list: wrap in `flex-1 overflow-y-auto min-h-0` to make it the scrollable region

The `220px` offset accounts for the app header (56px), project stats bar (60px), tabs bar (48px), and some padding (56px). This can be fine-tuned.

---

Note: 

- Don't make the multiple vertical scroll bars 
- make the user experience smooth and good. 

&nbsp;

## Technical Summary


| File                                              | Change                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/contexts/AuthContext.tsx`                    | Add `role` and `bio` to Profile interface; update fetch query           |
| `src/features/projects/components/KanbanView.tsx` | Constrain column height, make task area scrollable, keep headers pinned |
