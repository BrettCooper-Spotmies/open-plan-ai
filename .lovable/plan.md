
# Scalability Implementation Plan for Open Plan AI

## Current State Analysis

After exploring the codebase, I've identified the following architecture:

### What You Already Have
- **React Query**: Already installed and configured in `App.tsx`
- **Routing**: React Router DOM with 13+ routes
- **Mock Data Layer**: Comprehensive mock data in `src/data/mockData.ts` (810 lines)
- **Component Organization**: Partially feature-based (`calendar/`, `reports/`, `project/`, etc.)
- **Utilities**: Some utilities in `src/lib/` and feature-specific utils

### Key Issues to Address
1. **No global state**: All state is local `useState` with prop drilling
2. **Direct mock data imports**: Pages import directly from `mockData.ts`
3. **No service abstraction**: No layer between UI and data source
4. **No error boundaries**: Application can crash without recovery
5. **No testing infrastructure**: No test files or testing setup
6. **Loose TypeScript**: `strict: false`, `noImplicitAny: false`

---

## Implementation Plan (5 Phases)

### Phase 1: Foundation - Global State & Service Layer

**1.1 Install Dependencies**
```bash
npm install zustand immer axios
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**1.2 Create Zustand Stores**

| File | Purpose |
|------|---------|
| `src/stores/useProjectStore.ts` | Projects, tasks, milestones, issues state |
| `src/stores/useFilterStore.ts` | Report and task filter preferences |
| `src/stores/useUserStore.ts` | User preferences and theme settings |
| `src/stores/index.ts` | Barrel export for all stores |

**1.3 Create Service Layer**

| File | Purpose |
|------|---------|
| `src/services/api/client.ts` | Axios client with interceptors |
| `src/services/api/endpoints.ts` | Centralized API endpoint definitions |
| `src/services/projects.service.ts` | Project CRUD operations |
| `src/services/tasks.service.ts` | Task CRUD operations |
| `src/services/issues.service.ts` | Issue CRUD operations |
| `src/services/index.ts` | Barrel export |

The service layer supports three data sources controlled by environment variables:
- `VITE_USE_MOCK_DATA=true` → Uses mock data
- `VITE_USE_SUPABASE=true` → Uses Supabase (future)
- Otherwise → Uses REST API

**1.4 Update React Query Configuration**

Create `src/lib/queryClient.ts` with:
- 5-minute stale time
- 10-minute garbage collection
- Retry configuration
- Window focus refetch disabled

**1.5 Create React Query Hooks**

| File | Exports |
|------|---------|
| `src/hooks/useProjects.ts` | `useProjects`, `useProject`, `useCreateProject`, `useUpdateProject`, `useDeleteProject` |
| `src/hooks/useTasks.ts` | `useProjectTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask` |
| `src/hooks/useIssues.ts` | `useProjectIssues`, `useCreateIssue`, `useUpdateIssue` |

**1.6 Create Error Boundaries**

| File | Purpose |
|------|---------|
| `src/components/ErrorBoundary.tsx` | Global error boundary with recovery UI |
| `src/components/SuspenseFallback.tsx` | Loading state for lazy-loaded routes |

**1.7 Environment Configuration**

Create `.env.example`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCK_DATA=true
VITE_USE_SUPABASE=false
VITE_APP_NAME=Open Plan AI
```

---

### Phase 2: Feature-Based Folder Restructure

**New Folder Structure:**
```
src/
├── features/
│   ├── reports/
│   │   ├── components/
│   │   │   ├── ReportsHeader.tsx
│   │   │   ├── ReportsFilters.tsx
│   │   │   ├── ReportsKPIRow.tsx
│   │   │   ├── ReportTaskStatusChart.tsx
│   │   │   ├── ReportMilestoneHealth.tsx
│   │   │   ├── ReportTeamWorkload.tsx
│   │   │   ├── ReportModuleProgress.tsx
│   │   │   ├── ReportOpenIssuesTable.tsx
│   │   │   └── ReportTrendChart.tsx
│   │   ├── hooks/
│   │   │   ├── useReportData.ts
│   │   │   └── useReportFilters.ts
│   │   ├── utils/
│   │   │   └── reportsUtils.ts
│   │   ├── Reports.tsx
│   │   └── index.ts
│   ├── calendar/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── index.ts
│   ├── projects/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── index.ts
│   ├── dashboard/
│   ├── myday/
│   ├── team/
│   └── settings/
├── shared/
│   ├── components/
│   │   ├── ui/          (shadcn components - unchanged)
│   │   ├── layout/      (AppLayout, AppSidebar, etc.)
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   └── lib/
│       ├── utils.ts
│       └── queryClient.ts
├── services/
├── stores/
└── types/
```

**File Moves:**
- `src/components/reports/*` → `src/features/reports/components/*`
- `src/components/calendar/*` → `src/features/calendar/components/*`
- `src/components/project/*` → `src/features/projects/components/*`
- `src/components/dashboard/*` → `src/features/dashboard/components/*`
- `src/components/myday/*` → `src/features/myday/components/*`
- `src/pages/Reports.tsx` → `src/features/reports/Reports.tsx`
- etc.

**Create Barrel Exports** for each feature:
```typescript
// src/features/reports/index.ts
export { default } from './Reports';
export * from './hooks/useReportData';
```

---

### Phase 3: Testing Infrastructure

**3.1 Vitest Configuration**

Create `vitest.config.ts`:
- jsdom environment
- Global test utilities
- Coverage reporting (v8 provider)
- Path alias support

**3.2 Test Setup**

Create `src/test/setup.ts`:
- Import `@testing-library/jest-dom`
- Mock `window.matchMedia`
- Cleanup after each test

Create `src/test/utils.tsx`:
- Custom render with all providers (QueryClient, Router)
- Re-export testing-library utilities

**3.3 Update TypeScript Config**

Add `"vitest/globals"` to `tsconfig.app.json` types array.

**3.4 Sample Tests**

| Test File | Coverage |
|-----------|----------|
| `src/features/reports/__tests__/reportsUtils.test.ts` | KPI calculations, status breakdown |
| `src/features/reports/__tests__/ReportsKPIRow.test.tsx` | Component rendering, click handlers |
| `src/stores/__tests__/useProjectStore.test.ts` | Store actions and state updates |

**3.5 Update package.json Scripts**

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "type-check": "tsc --noEmit"
  }
}
```

---

### Phase 4: Update Core Pages to Use New Architecture

**4.1 Update `main.tsx`**

- Move QueryClient to `src/lib/queryClient.ts`
- Add ReactQueryDevtools (dev only)
- Wrap app in ErrorBoundary

**4.2 Update `App.tsx`**

- Add lazy loading for routes using `React.lazy`
- Wrap routes in Suspense with fallback
- Add Error Boundary per-route

**4.3 Migrate Reports Page**

Transform from direct mock data imports to:
1. Use `useProjects()` hook for data fetching
2. Use `useFilterStore()` for filter state persistence
3. Use service layer for any mutations

**4.4 Migrate ProjectDetail Page**

Current issues:
- Directly mutates `projects` array from mock data
- Local state doesn't sync with global state

Transform to:
1. Use `useProject(id)` hook for data
2. Use `useUpdateProject()` mutation
3. Use `useUpdateTask()` for task changes
4. Remove direct mock data mutations

---

### Phase 5: Performance & Polish

**5.1 Add Virtual Scrolling**

Install `@tanstack/react-virtual` for large lists:
- Task lists in Project Detail
- Issues tables
- Any list > 50 items

**5.2 Memoization Improvements**

- Add `React.memo` to expensive list item components
- Ensure `useCallback` for handlers passed to children
- Use `useMemo` for derived data calculations

**5.3 Code Splitting Verification**

Ensure all routes are lazy-loaded:
```typescript
const Reports = lazy(() => import('@/features/reports'));
const Projects = lazy(() => import('@/features/projects'));
const Calendar = lazy(() => import('@/features/calendar'));
```

**5.4 TypeScript Strictness (Optional)**

Gradually enable strict mode:
1. First: Enable `noImplicitAny: true`
2. Later: Enable `strict: true`

---

## Migration Strategy

### Safe Migration Order

1. **Add new infrastructure** (stores, services, hooks) - non-breaking
2. **Update one feature at a time** starting with Reports
3. **Keep mock data** working throughout
4. **Move files** after functionality is verified
5. **Add tests** for critical paths
6. **Enable stricter TypeScript** last

### Parallel Development

During migration:
- Old direct imports continue working
- New patterns available for new code
- Gradual adoption per-feature

---

## Files to Create (Summary)

| Category | Files |
|----------|-------|
| **Stores** | `useProjectStore.ts`, `useFilterStore.ts`, `useUserStore.ts`, `index.ts` |
| **Services** | `api/client.ts`, `api/endpoints.ts`, `projects.service.ts`, `tasks.service.ts`, `issues.service.ts` |
| **Hooks** | `useProjects.ts`, `useTasks.ts`, `useIssues.ts` |
| **Core** | `lib/queryClient.ts`, `components/ErrorBoundary.tsx` |
| **Testing** | `vitest.config.ts`, `test/setup.ts`, `test/utils.tsx` |
| **Config** | `.env.example`, updates to `package.json`, `tsconfig.app.json` |

---

## Success Metrics

After implementation:
- Zero prop drilling for global state
- Service layer abstracts data source
- Feature-based folder structure
- Test coverage infrastructure ready
- Error recovery for crashes
- State persists across navigation
- React Query DevTools for debugging

---

## Technical Notes

### Data Flow (After Migration)
```
UI Component
    ↓
React Query Hook (useProjects, useTasks)
    ↓
Service Layer (projectsService.getAll)
    ↓
Data Source (Mock → Supabase → REST API)
```

### Backward Compatibility

- Mock data remains unchanged
- Service layer returns same data shapes
- Existing component props unchanged
- Only internal data fetching changes
