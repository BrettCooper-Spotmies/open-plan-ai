
# Phase 2: Feature-Based Restructuring Plan

## Overview

Reorganize the codebase from a flat component structure to a scalable feature-based architecture. This will improve maintainability, enable better code splitting, and make the codebase easier to navigate as it grows.

## Current vs Target Structure

```text
CURRENT STRUCTURE                          TARGET STRUCTURE
─────────────────                          ─────────────────
src/                                       src/
├── components/                            ├── features/
│   ├── calendar/                          │   ├── reports/
│   ├── dashboard/                         │   │   ├── components/
│   ├── layout/                            │   │   ├── utils/
│   ├── myday/                             │   │   ├── Reports.tsx
│   ├── project/                           │   │   └── index.ts
│   ├── reports/                           │   ├── calendar/
│   └── ui/                                │   ├── projects/
├── pages/                                 │   ├── dashboard/
│   ├── Reports.tsx                        │   ├── myday/
│   ├── Calendar.tsx                       │   ├── team/
│   ├── Projects.tsx                       │   └── settings/
│   └── ...                                ├── components/
├── hooks/                                 │   ├── ui/     (shadcn - unchanged)
├── lib/                                   │   ├── layout/ (shared layout)
└── stores/                                │   └── shared/ (common components)
                                           ├── hooks/     (shared hooks)
                                           ├── lib/       (shared utilities)
                                           ├── stores/    (global state)
                                           ├── services/  (API layer)
                                           └── types/     (shared types)
```

---

## Implementation Strategy

### Approach: Incremental Migration

1. Create new `src/features/` folder structure
2. Move one feature at a time (starting with Reports)
3. Update imports as we go
4. Keep shared components in `src/components/`
5. Update `App.tsx` to use new paths

### Key Principles

- **No breaking changes** - Keep app working throughout migration
- **Preserve lazy loading** - Maintain code splitting via dynamic imports
- **Shared components stay shared** - `ui/`, `layout/` remain in `src/components/`
- **Feature isolation** - Each feature owns its components, utils, and hooks

---

## Files to Create/Move

### Feature 1: Reports

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Reports.tsx` | `src/features/reports/Reports.tsx` |
| Move | `src/components/reports/ReportsHeader.tsx` | `src/features/reports/components/ReportsHeader.tsx` |
| Move | `src/components/reports/ReportsFilters.tsx` | `src/features/reports/components/ReportsFilters.tsx` |
| Move | `src/components/reports/ReportsKPIRow.tsx` | `src/features/reports/components/ReportsKPIRow.tsx` |
| Move | `src/components/reports/ReportTaskStatusChart.tsx` | `src/features/reports/components/ReportTaskStatusChart.tsx` |
| Move | `src/components/reports/ReportMilestoneHealth.tsx` | `src/features/reports/components/ReportMilestoneHealth.tsx` |
| Move | `src/components/reports/ReportTeamWorkload.tsx` | `src/features/reports/components/ReportTeamWorkload.tsx` |
| Move | `src/components/reports/ReportModuleProgress.tsx` | `src/features/reports/components/ReportModuleProgress.tsx` |
| Move | `src/components/reports/ReportOpenIssuesTable.tsx` | `src/features/reports/components/ReportOpenIssuesTable.tsx` |
| Move | `src/components/reports/ReportTrendChart.tsx` | `src/features/reports/components/ReportTrendChart.tsx` |
| Move | `src/components/reports/reportsUtils.ts` | `src/features/reports/utils/reportsUtils.ts` |
| Create | - | `src/features/reports/index.ts` (barrel export) |

### Feature 2: Calendar

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Calendar.tsx` | `src/features/calendar/Calendar.tsx` |
| Move | `src/components/calendar/*` (8 files) | `src/features/calendar/components/*` |
| Create | - | `src/features/calendar/index.ts` |

### Feature 3: Projects

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Projects.tsx` | `src/features/projects/Projects.tsx` |
| Move | `src/pages/ProjectDetail.tsx` | `src/features/projects/ProjectDetail.tsx` |
| Move | `src/pages/NewProject.tsx` | `src/features/projects/NewProject.tsx` |
| Move | `src/pages/IssuePage.tsx` | `src/features/projects/IssuePage.tsx` |
| Move | `src/components/project/*` (19 files) | `src/features/projects/components/*` |
| Move | `src/lib/projectUtils.ts` | `src/features/projects/utils/projectUtils.ts` |
| Create | - | `src/features/projects/index.ts` |

### Feature 4: Dashboard

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Dashboard.tsx` | `src/features/dashboard/Dashboard.tsx` |
| Move | `src/components/dashboard/*` (4 files) | `src/features/dashboard/components/*` |
| Create | - | `src/features/dashboard/index.ts` |

### Feature 5: MyDay

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/MyDay.tsx` | `src/features/myday/MyDay.tsx` |
| Move | `src/components/myday/*` (6 files) | `src/features/myday/components/*` |
| Move | `src/lib/myDayUtils.ts` | `src/features/myday/utils/myDayUtils.ts` |
| Create | - | `src/features/myday/index.ts` |

### Feature 6: Team

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Team.tsx` | `src/features/team/Team.tsx` |
| Create | - | `src/features/team/index.ts` |

### Feature 7: Settings

| Action | Source | Destination |
|--------|--------|-------------|
| Move | `src/pages/Settings.tsx` | `src/features/settings/Settings.tsx` |
| Create | - | `src/features/settings/index.ts` |

---

## Barrel Export Pattern

Each feature will have an `index.ts` that exports the main page component as default:

```typescript
// src/features/reports/index.ts
export { default } from './Reports';

// Optional: Re-export components for use elsewhere
export { ReportsHeader } from './components/ReportsHeader';
export { ReportsKPIRow } from './components/ReportsKPIRow';

// Re-export utilities if needed by other features
export * from './utils/reportsUtils';
```

---

## App.tsx Changes

Update lazy imports to point to new feature locations:

```typescript
// Before
const Reports = lazy(() => import("./pages/Reports"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Projects = lazy(() => import("./pages/Projects"));

// After
const Reports = lazy(() => import("./features/reports"));
const Calendar = lazy(() => import("./features/calendar"));
const Projects = lazy(() => import("./features/projects"));
```

---

## Shared Components (Stay in Place)

These will **NOT** move - they're shared across features:

| Component | Location | Used By |
|-----------|----------|---------|
| `ui/*` | `src/components/ui/` | All features |
| `AppLayout` | `src/components/layout/` | All pages |
| `AppSidebar` | `src/components/layout/` | AppLayout |
| `AppHeader` | `src/components/layout/` | AppLayout |
| `ErrorBoundary` | `src/components/` | App.tsx |
| `SuspenseFallback` | `src/components/` | App.tsx |
| `NavLink` | `src/components/` | AppSidebar |
| `TaskDetailModal` | `src/features/projects/components/` | Calendar, MyDay |

---

## Cross-Feature Dependencies

Some components are used across features:

| Component | Owner Feature | Used By |
|-----------|---------------|---------|
| `TaskDetailModal` | projects | calendar, myday |
| `MilestoneDetailModal` | projects | calendar |
| `IssueDetailModal` | projects | calendar |

These will stay in `projects` feature and be imported by other features as needed.

---

## Implementation Order

1. **Create folder structure** - Empty feature folders
2. **Reports feature** - Move all reports files
3. **Calendar feature** - Move calendar files
4. **Projects feature** - Move projects files (largest)
5. **Dashboard feature** - Move dashboard files
6. **MyDay feature** - Move myday files
7. **Team feature** - Move team files
8. **Settings feature** - Move settings files
9. **Update App.tsx** - Point to new locations
10. **Cleanup** - Remove empty folders

---

## Technical Details

### Import Updates Required

Each moved file needs import path updates:

```typescript
// Before (in Reports.tsx)
import { AppLayout } from '@/components/layout/AppLayout';
import { ReportsHeader } from '@/components/reports/ReportsHeader';

// After (in src/features/reports/Reports.tsx)
import { AppLayout } from '@/components/layout/AppLayout';  // unchanged - shared
import { ReportsHeader } from './components/ReportsHeader'; // relative import
```

### Pages That Stay in src/pages/

These auth-related pages don't need feature folders:

- `Login.tsx`
- `Signup.tsx`
- `ForgotPassword.tsx`
- `NotFound.tsx`
- `Index.tsx`

---

## Success Criteria

After Phase 2 completion:

- All feature-related code lives in `src/features/[feature-name]/`
- Each feature has its own `index.ts` barrel export
- Lazy loading works correctly for all routes
- Shared components remain accessible at `@/components/`
- No broken imports or runtime errors
- Build succeeds without errors

---

## File Count Summary

| Feature | Components | Utils | Pages | Total Files |
|---------|------------|-------|-------|-------------|
| Reports | 9 | 1 | 1 | 11 + index |
| Calendar | 8 | 1 | 1 | 10 + index |
| Projects | 19 | 1 | 4 | 24 + index |
| Dashboard | 4 | 0 | 1 | 5 + index |
| MyDay | 6 | 1 | 1 | 8 + index |
| Team | 0 | 0 | 1 | 1 + index |
| Settings | 0 | 0 | 1 | 1 + index |
| **Total** | **46** | **4** | **10** | **60 + 7 indexes** |

---

## Risk Mitigation

1. **Broken imports** - Use TypeScript to catch missing imports at compile time
2. **Lazy loading issues** - Test each route after migration
3. **Circular dependencies** - Keep shared components in `src/components/`
4. **Lost context** - Maintain same component names and file structure within features
