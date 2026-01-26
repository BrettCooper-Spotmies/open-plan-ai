
# Phase 3: Complete Testing Infrastructure

## Current State

Good news - the audit report was outdated! Testing infrastructure is **further along** than reported:

| Component | Status | Notes |
|-----------|--------|-------|
| Test infrastructure | Complete | Vitest + Testing Library configured |
| Test utilities | Complete | Custom render with providers |
| Feature utility tests | Partial | 3 test files exist (595+ lines) |
| Service layer tests | Not started | 0 files |
| Store tests | Not started | 0 files |
| Hook tests | Not started | 0 files |
| Component tests | Not started | 0 files |

**Current Tests Found:**
- `src/features/reports/__tests__/reportsUtils.test.ts` - 349 lines, 30+ test cases
- `src/features/reports/__tests__/ReportsKPIRow.test.tsx` - 131 lines, 14 test cases
- `src/features/projects/__tests__/projectUtils.test.ts` - 246 lines, 20+ test cases

---

## Implementation Plan

### Step 1: Service Layer Tests (High Priority)

Create tests for all three service modules that handle data operations.

**File: `src/services/__tests__/projects.service.test.ts`**
- Test `getAll()` returns array of projects
- Test `getById()` returns project or null
- Test `create()` adds new project with generated ID
- Test `update()` modifies existing project
- Test `delete()` removes project
- Test `getTasks()` returns project tasks
- Test `getMilestones()` returns project milestones
- Test `getIssues()` returns project issues
- Test error cases (project not found)

**File: `src/services/__tests__/tasks.service.test.ts`**
- Test `getAll()` returns all tasks across projects
- Test `getById()` returns task or null
- Test `create()` adds task to project
- Test `update()` modifies existing task
- Test `delete()` removes task
- Test `batchUpdate()` updates multiple tasks
- Test error cases (project/task not found)

**File: `src/services/__tests__/issues.service.test.ts`**
- Test `getAll()` returns all issues
- Test `getById()` returns issue or null
- Test `create()` adds issue to project
- Test `update()` modifies existing issue
- Test `delete()` removes issue
- Test `getOpenCount()` returns correct counts
- Test critical issue counting

---

### Step 2: Zustand Store Tests (High Priority)

Test all store actions and selectors for the three Zustand stores.

**File: `src/stores/__tests__/useProjectStore.test.ts`**
- Test initial state
- Test `setProjects()` updates projects array
- Test `selectProject()` sets selected ID
- Test `addProject()` adds to array
- Test `updateProject()` modifies project
- Test `deleteProject()` removes project
- Test task CRUD actions (addTask, updateTask, deleteTask)
- Test milestone CRUD actions
- Test issue CRUD actions
- Test selectors (useSelectedProject, useProjectById, useAllTasks, useAllIssues)
- Test persistence (store survives reset)
- Test reset() clears state

**File: `src/stores/__tests__/useFilterStore.test.ts`**
- Test initial state (default filters)
- Test `setReportFilters()` partial updates
- Test `resetReportFilters()` returns to defaults
- Test `setTaskFilters()` partial updates
- Test `resetTaskFilters()` returns to defaults
- Test `setSearchQuery()` updates search
- Test `setProjectViewPreference()` per-project prefs
- Test persistence

**File: `src/stores/__tests__/useUserStore.test.ts`**
- Test initial state (null user, not authenticated)
- Test `setUser()` sets user and auth flag
- Test `updatePreferences()` merges preferences
- Test `logout()` clears user state
- Test sidebar state toggles
- Test persistence of user preferences

---

### Step 3: React Query Hook Tests (Medium Priority)

Test the custom hooks that wrap React Query for data fetching.

**File: `src/hooks/__tests__/useProjects.test.tsx`**
- Test `useProjects()` fetches and returns projects
- Test `useProject(id)` fetches single project
- Test `useCreateProject()` mutation calls service
- Test `useUpdateProject()` mutation with optimistic update
- Test `useDeleteProject()` mutation
- Test query invalidation after mutations
- Test loading and error states
- Test `enabled` flag behavior

**File: `src/hooks/__tests__/useTasks.test.tsx`**
- Test `useAllTasks()` fetches all tasks
- Test `useProjectTasks(projectId)` filters by project
- Test `useTask(taskId)` fetches single task
- Test `useCreateTask()` mutation
- Test `useUpdateTask()` mutation with optimistic update
- Test `useDeleteTask()` mutation
- Test `useBatchUpdateTasks()` for drag-drop
- Test query invalidation

**File: `src/hooks/__tests__/useIssues.test.tsx`**
- Test `useAllIssues()` fetches all issues
- Test `useProjectIssues(projectId)` filters by project
- Test `useCreateIssue()` mutation
- Test `useUpdateIssue()` mutation
- Test `useDeleteIssue()` mutation
- Test query invalidation

---

### Step 4: Component Tests (Medium Priority)

Test key shared components for correct rendering and behavior.

**File: `src/components/__tests__/ErrorBoundary.test.tsx`**
- Test renders children when no error
- Test catches error and shows fallback UI
- Test error message is displayed
- Test "Try Again" button resets state
- Test "Refresh Page" button calls reload
- Test "Go Home" button navigates
- Test custom fallback prop is used
- Test logger is called on error
- Test `withErrorBoundary` HOC works

**File: `src/components/__tests__/SuspenseFallback.test.tsx`**
- Test renders loading spinner by default
- Test different variant props (card, list, chart)
- Test correct skeleton counts
- Test accessibility (aria labels)

**File: `src/components/__tests__/NavLink.test.tsx`**
- Test renders link with correct href
- Test active state styling
- Test icon and label rendering
- Test click navigation

---

### Step 5: Integration Tests (Lower Priority)

Test complete workflows spanning multiple components.

**File: `src/__tests__/integration/project-workflow.test.tsx`**
- Test creating a new project
- Test viewing project list
- Test navigating to project detail
- Test updating project
- Test deleting project

**File: `src/__tests__/integration/task-workflow.test.tsx`**
- Test creating a task within project
- Test changing task status
- Test filtering tasks
- Test drag-drop reordering (batch update)

---

## Files to Create

| File | Lines (est.) | Tests (est.) | Priority |
|------|--------------|--------------|----------|
| `src/services/__tests__/projects.service.test.ts` | 150-200 | 15-20 | HIGH |
| `src/services/__tests__/tasks.service.test.ts` | 150-180 | 15-18 | HIGH |
| `src/services/__tests__/issues.service.test.ts` | 140-160 | 12-15 | HIGH |
| `src/stores/__tests__/useProjectStore.test.ts` | 200-250 | 20-25 | HIGH |
| `src/stores/__tests__/useFilterStore.test.ts` | 100-120 | 12-15 | HIGH |
| `src/stores/__tests__/useUserStore.test.ts` | 80-100 | 10-12 | HIGH |
| `src/hooks/__tests__/useProjects.test.tsx` | 150-180 | 12-15 | MEDIUM |
| `src/hooks/__tests__/useTasks.test.tsx` | 160-200 | 15-18 | MEDIUM |
| `src/hooks/__tests__/useIssues.test.tsx` | 130-150 | 12-14 | MEDIUM |
| `src/components/__tests__/ErrorBoundary.test.tsx` | 120-150 | 10-12 | MEDIUM |
| `src/components/__tests__/SuspenseFallback.test.tsx` | 60-80 | 6-8 | MEDIUM |
| `src/components/__tests__/NavLink.test.tsx` | 60-80 | 6-8 | MEDIUM |
| `src/__tests__/integration/project-workflow.test.tsx` | 150-200 | 8-10 | LOW |
| `src/__tests__/integration/task-workflow.test.tsx` | 150-180 | 8-10 | LOW |

**Total: ~1,600-1,900 lines of test code, 150-200 test cases**

---

## Test Patterns to Follow

### Service Test Pattern
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectsService } from '../projects.service';

// Mock the config to use mock data
vi.mock('@/config', () => ({
  config: { api: { useMockData: true } }
}));

describe('projectsService', () => {
  describe('getAll', () => {
    it('should return array of projects', async () => {
      const projects = await projectsService.getAll();
      expect(Array.isArray(projects)).toBe(true);
      expect(projects.length).toBeGreaterThan(0);
    });
  });
});
```

### Store Test Pattern
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../useProjectStore';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().reset();
  });

  it('should add project to store', () => {
    const { addProject } = useProjectStore.getState();
    const project = { id: 'test-1', name: 'Test', ... };
    
    addProject(project);
    
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });
});
```

### Hook Test Pattern (with renderHook)
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '../useProjects';
import { createWrapper } from '@/test/utils';

describe('useProjects', () => {
  it('should fetch projects', async () => {
    const { result } = renderHook(() => useProjects(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Technical Considerations

### Mocking Strategy
- Mock `@/config` to control mock data flag
- Mock services for hook tests (isolate from real data)
- Use `vi.spyOn` for partial mocking
- Reset mocks in `beforeEach`

### Test Utilities Enhancement
Add `createWrapper` function for renderHook:
```typescript
export function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Store Testing
- Use `getState()` to access store directly
- Call `reset()` in `beforeEach` to clean state
- Test selectors with mock state

---

## Success Criteria

After implementation:
- 14+ new test files created
- 150+ new test cases
- All services have 80%+ coverage
- All stores have 90%+ coverage
- All hooks have 70%+ coverage
- ErrorBoundary has full coverage
- Tests run in under 10 seconds
- No flaky tests

---

## Implementation Order

1. **Service tests first** (foundation - everything else depends on these)
2. **Store tests** (critical for state management validation)
3. **Hook tests** (integration between services and stores)
4. **Component tests** (UI behavior)
5. **Integration tests** (end-to-end workflows)

Recommend starting with `src/services/__tests__/projects.service.test.ts` as it's the most used service.
