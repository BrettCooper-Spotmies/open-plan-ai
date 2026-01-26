
# Phase 2 Completion Plan

## Overview

Complete the feature-based restructuring by migrating remaining features (Projects, MyDay components) and cleaning up duplicate files. This will achieve the target architecture with all features properly organized under `src/features/`.

## Current State Analysis

### Features Already Migrated (In `src/features/`)
| Feature | Status | Notes |
|---------|--------|-------|
| reports | Complete | Components, utils, barrel export |
| calendar | Complete | Components, utils, barrel export |
| dashboard | Complete | Components, barrel export |
| myday | Partial | Main page only, components still in old location |
| team | Complete | Main page, barrel export |
| settings | Complete | Main page, barrel export |

### Features Needing Migration
| Feature | Files to Move | Effort |
|---------|---------------|--------|
| projects | 4 pages + 19 components + 1 util | High |
| myday | 6 components | Low |

### Duplicate Files to Delete
| Directory | Status |
|-----------|--------|
| `src/components/reports/` | 10 files - should be deleted |
| `src/components/calendar/` | 8 files - should be deleted |
| `src/components/dashboard/` | 4 files - should be deleted |
| `src/components/myday/` | 6 files - after migration |
| `src/components/project/` | 19 files - after projects migration |
| `src/pages/Reports.tsx` | Should be deleted |
| `src/pages/Calendar.tsx` | Should be deleted |
| `src/pages/Dashboard.tsx` | Should be deleted |
| `src/pages/MyDay.tsx` | Should be deleted |
| `src/pages/Projects.tsx` | After migration |
| `src/pages/ProjectDetail.tsx` | After migration |
| `src/pages/NewProject.tsx` | After migration |
| `src/pages/IssuePage.tsx` | After migration |

---

## Implementation Steps

### Step 1: Complete MyDay Feature Migration

Move the 6 MyDay components from `src/components/myday/` to `src/features/myday/components/`:

| Source | Destination |
|--------|-------------|
| `src/components/myday/MyDayStats.tsx` | `src/features/myday/components/MyDayStats.tsx` |
| `src/components/myday/MyDayKanbanView.tsx` | `src/features/myday/components/MyDayKanbanView.tsx` |
| `src/components/myday/MyDayListView.tsx` | `src/features/myday/components/MyDayListView.tsx` |
| `src/components/myday/MyDayGroupBySelector.tsx` | `src/features/myday/components/MyDayGroupBySelector.tsx` |
| `src/components/myday/MyDaySection.tsx` | `src/features/myday/components/MyDaySection.tsx` |
| `src/components/myday/MyDayTaskCard.tsx` | `src/features/myday/components/MyDayTaskCard.tsx` |

Update `src/features/myday/MyDay.tsx` imports to use relative paths.

---

### Step 2: Create Projects Feature Structure

Create the projects feature with all pages and components:

```text
src/features/projects/
├── components/
│   ├── AddMilestoneDialog.tsx
│   ├── AddModuleDialog.tsx
│   ├── DependencyView.tsx
│   ├── IssueDetailContent.tsx
│   ├── IssueDetailModal.tsx
│   ├── IssuesView.tsx
│   ├── KanbanView.tsx
│   ├── ListView.tsx
│   ├── MilestoneDetailModal.tsx
│   ├── MilestonesView.tsx
│   ├── ModuleDetailModal.tsx
│   ├── ModulesKanbanView.tsx
│   ├── ModulesListView.tsx
│   ├── ModulesSection.tsx
│   ├── TaskDetailModal.tsx
│   ├── TaskFilters.tsx
│   ├── TaskFiltersDropdown.tsx
│   ├── TasksSection.tsx
│   └── TimelineView.tsx
├── utils/
│   └── projectUtils.ts
├── Projects.tsx
├── ProjectDetail.tsx
├── NewProject.tsx
├── IssuePage.tsx
└── index.ts
```

Files to move:
- `src/pages/Projects.tsx` → `src/features/projects/Projects.tsx`
- `src/pages/ProjectDetail.tsx` → `src/features/projects/ProjectDetail.tsx`
- `src/pages/NewProject.tsx` → `src/features/projects/NewProject.tsx`
- `src/pages/IssuePage.tsx` → `src/features/projects/IssuePage.tsx`
- `src/components/project/*` (19 files) → `src/features/projects/components/*`
- `src/lib/projectUtils.ts` → `src/features/projects/utils/projectUtils.ts`

---

### Step 3: Update App.tsx Routes

Add lazy loading for the new projects feature pages:

```typescript
const Projects = lazy(() => import("./features/projects"));
const ProjectDetail = lazy(() => 
  import("./features/projects/ProjectDetail").then(m => ({ default: m.default }))
);
const NewProject = lazy(() => 
  import("./features/projects/NewProject").then(m => ({ default: m.default }))
);
const IssuePage = lazy(() => 
  import("./features/projects/IssuePage").then(m => ({ default: m.default }))
);
```

---

### Step 4: Delete Duplicate Old Files

After migration is complete, delete:

**Old component directories:**
- `src/components/reports/` (10 files)
- `src/components/calendar/` (8 files)
- `src/components/dashboard/` (4 files)
- `src/components/myday/` (6 files)
- `src/components/project/` (19 files)

**Old page files:**
- `src/pages/Reports.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/MyDay.tsx`
- `src/pages/Projects.tsx`
- `src/pages/ProjectDetail.tsx`
- `src/pages/NewProject.tsx`
- `src/pages/IssuePage.tsx`

**Keep in `src/pages/`:**
- `Login.tsx` (auth pages stay for now)
- `Signup.tsx`
- `ForgotPassword.tsx`
- `NotFound.tsx`
- `Index.tsx`

---

### Step 5: Update Cross-Feature Imports

Some features depend on project components. Update these imports:

| Feature | Component Used | New Import Path |
|---------|----------------|-----------------|
| calendar | TaskDetailModal | `@/features/projects/components/TaskDetailModal` |
| myday | TaskDetailModal | `@/features/projects/components/TaskDetailModal` |

---

## Files Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/features/myday/components/MyDayStats.tsx` | Stats component |
| `src/features/myday/components/MyDayKanbanView.tsx` | Kanban view |
| `src/features/myday/components/MyDayListView.tsx` | List view |
| `src/features/myday/components/MyDayGroupBySelector.tsx` | Group selector |
| `src/features/myday/components/MyDaySection.tsx` | Section component |
| `src/features/myday/components/MyDayTaskCard.tsx` | Task card |
| `src/features/projects/Projects.tsx` | Projects list page |
| `src/features/projects/ProjectDetail.tsx` | Project detail page |
| `src/features/projects/NewProject.tsx` | New project form |
| `src/features/projects/IssuePage.tsx` | Issue detail page |
| `src/features/projects/components/*.tsx` | 19 component files |
| `src/features/projects/utils/projectUtils.ts` | Project utilities |
| `src/features/projects/index.ts` | Barrel export |

### Files to Update

| File | Changes |
|------|---------|
| `src/features/myday/MyDay.tsx` | Update imports to relative paths |
| `src/features/calendar/Calendar.tsx` | Update TaskDetailModal import |
| `src/App.tsx` | Update Projects route imports |

### Files to Delete (After Migration)

- `src/components/reports/*` (10 files)
- `src/components/calendar/*` (8 files)
- `src/components/dashboard/*` (4 files)
- `src/components/myday/*` (6 files)
- `src/components/project/*` (19 files)
- `src/lib/projectUtils.ts`
- `src/pages/Reports.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/MyDay.tsx`
- `src/pages/Projects.tsx`
- `src/pages/ProjectDetail.tsx`
- `src/pages/NewProject.tsx`
- `src/pages/IssuePage.tsx`

---

## Target Structure After Completion

```text
src/
├── features/
│   ├── calendar/
│   │   ├── components/     (7 files)
│   │   ├── utils/
│   │   ├── Calendar.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── components/     (4 files)
│   │   ├── Dashboard.tsx
│   │   └── index.ts
│   ├── myday/
│   │   ├── components/     (6 files)
│   │   ├── MyDay.tsx
│   │   └── index.ts
│   ├── projects/
│   │   ├── components/     (19 files)
│   │   ├── utils/
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   ├── NewProject.tsx
│   │   ├── IssuePage.tsx
│   │   └── index.ts
│   ├── reports/
│   │   ├── components/     (9 files)
│   │   ├── utils/
│   │   ├── Reports.tsx
│   │   └── index.ts
│   ├── settings/
│   │   ├── Settings.tsx
│   │   └── index.ts
│   └── team/
│       ├── Team.tsx
│       └── index.ts
├── components/
│   ├── layout/            (AppLayout, AppSidebar, AppHeader)
│   ├── ui/                (50+ shadcn components - unchanged)
│   ├── ErrorBoundary.tsx
│   ├── SuspenseFallback.tsx
│   └── NavLink.tsx
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── ForgotPassword.tsx
│   ├── NotFound.tsx
│   └── Index.tsx
├── hooks/
├── lib/
├── services/
├── stores/
├── config/
└── types/
```

---

## Success Criteria

After implementation:

- All feature code organized under `src/features/`
- Each feature has its own components, utils, and barrel exports
- No duplicate files between old and new locations
- All routes use lazy loading from feature directories
- Cross-feature dependencies use absolute imports (`@/features/...`)
- Application functions correctly with no broken imports
- Build succeeds without errors

---

## Technical Notes

### Import Path Updates

Each migrated component needs import path updates:

```typescript
// Before (in ProjectDetail.tsx)
import { TasksSection } from '@/components/project/TasksSection';
import { ModulesSection } from '@/components/project/ModulesSection';

// After (in src/features/projects/ProjectDetail.tsx)
import { TasksSection } from './components/TasksSection';
import { ModulesSection } from './components/ModulesSection';
```

### Barrel Export Pattern

```typescript
// src/features/projects/index.ts
export { default } from './Projects';
export { default as ProjectDetail } from './ProjectDetail';
export { default as NewProject } from './NewProject';
export { default as IssuePage } from './IssuePage';
```

### Cross-Feature Component Usage

The `TaskDetailModal` is used by multiple features. After migration:

```typescript
// In src/features/calendar/Calendar.tsx
import { TaskDetailModal } from '@/features/projects/components/TaskDetailModal';

// In src/features/myday/MyDay.tsx
import { TaskDetailModal } from '@/features/projects/components/TaskDetailModal';
```
