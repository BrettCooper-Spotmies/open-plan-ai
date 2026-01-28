

# Project Backend Integration Plan

## Overview

This plan integrates the Projects feature with the Supabase backend, replacing the current mock data dependencies. This includes full CRUD operations for projects, tasks, milestones, issues, and modules.

---

## Current State Analysis

### What Works (Already Integrated)
| Component | Status |
|-----------|--------|
| `projectsService.ts` | Has Supabase queries but uses config flag to switch between mock/Supabase |
| `tasksService.ts` | Has Supabase queries with assignee relations |
| `issuesService.ts` | Has Supabase queries with assignee relations |
| `milestonesService.ts` | Fully integrated with Supabase (no mock fallback) |
| `modulesService.ts` | Fully integrated with Supabase (no mock fallback) |

### What Needs Fixing
| Component | Issue |
|-----------|-------|
| `Projects.tsx` | Uses `useProjects()` hook - correctly integrated |
| `ProjectDetail.tsx` | **Directly imports mock data** - bypasses services entirely |
| `NewProject.tsx` | Only logs data, doesn't save to database |
| `useProjects.ts` | Works with services, but needs additional hooks |
| `useTasks.ts` | Works but not used in ProjectDetail |
| Config flags | `VITE_USE_SUPABASE` and `VITE_USE_MOCK_DATA` control data source |

---

## Problem Details

### ProjectDetail.tsx Issues

The main problem is in `ProjectDetail.tsx` (line 14):
```typescript
import { projects, projectModules, teamMembers as allTeamMembers } from '@/data/mockData';
```

This component:
1. Directly reads from mock data array instead of using services
2. Uses local `useState` to manage project data
3. All create/update handlers mutate mock arrays directly
4. Doesn't use React Query hooks at all

### NewProject.tsx Issues

The form only logs data to console (line 343-364):
```typescript
const handleCreateProject = () => {
  console.log("Creating project:", { ... });
  navigate("/projects");
};
```

No actual database insertion happens.

---

## Implementation Plan

### Phase 1: Create Custom Hooks for Project Detail

**New File: `src/hooks/useProjectDetail.ts`**

Create a comprehensive hook that fetches a project with all related data:

```typescript
export function useProjectDetail(projectId: string) {
  // Parallel fetch: project, tasks, milestones, issues, modules
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: async () => {
      const project = await projectsService.getById(projectId);
      // getById already fetches tasks, milestones, issues
      return project;
    }
  });
}

export function useProjectModules(projectId: string) {
  return useQuery({
    queryKey: queryKeys.modules.list(projectId),
    queryFn: () => modulesService.getByProjectId(projectId)
  });
}
```

**New File: `src/hooks/useProjectMutations.ts`**

Create mutation hooks for all project-related operations:

```typescript
// Task mutations
export function useCreateTask(projectId: string) { ... }
export function useUpdateTask(projectId: string) { ... }
export function useDeleteTask(projectId: string) { ... }

// Milestone mutations  
export function useCreateMilestone(projectId: string) { ... }
export function useUpdateMilestone(projectId: string) { ... }

// Issue mutations
export function useCreateIssue(projectId: string) { ... }
export function useUpdateIssue(projectId: string) { ... }

// Module mutations
export function useCreateModule(projectId: string) { ... }
export function useUpdateModule(projectId: string) { ... }
```

---

### Phase 2: Update ProjectDetail.tsx

**Major Refactoring Required:**

1. **Remove mock data imports:**
```typescript
// REMOVE:
import { projects, projectModules, teamMembers as allTeamMembers } from '@/data/mockData';

// ADD:
import { useProjectDetail, useProjectModules } from '@/hooks/useProjectDetail';
import { useCreateTask, useUpdateTask, ... } from '@/hooks/useProjectMutations';
```

2. **Replace local state with React Query:**
```typescript
// REMOVE:
const [projectData, setProjectData] = useState<Project | undefined>(
  () => projects.find(p => p.id === id)
);

// ADD:
const { data: project, isLoading, error } = useProjectDetail(id);
const { data: modules = [] } = useProjectModules(id);
```

3. **Replace local handlers with mutations:**
```typescript
// REMOVE direct mock mutation:
const handleIssueCreate = (newIssuePartial: Partial<Issue>) => {
  const originalProject = projects.find(...);
  originalProject.issues.unshift(newIssue);
  setProjectData(...);
};

// ADD mutation:
const createIssueMutation = useCreateIssue(id);
const handleIssueCreate = (newIssuePartial: Partial<Issue>) => {
  createIssueMutation.mutate(newIssuePartial);
};
```

4. **Add loading and error states:**
```typescript
if (isLoading) {
  return <AppLayout><ProjectDetailSkeleton /></AppLayout>;
}

if (error || !project) {
  return <AppLayout><ProjectNotFound /></AppLayout>;
}
```

---

### Phase 3: Update NewProject.tsx

**Connect form submission to backend:**

1. **Import required hooks:**
```typescript
import { useCreateProject } from '@/hooks/useProjects';
import { useOrganization } from '@/contexts/OrganizationContext';
```

2. **Update handleCreateProject:**
```typescript
const { currentOrganization } = useOrganization();
const createProjectMutation = useCreateProject();

const handleCreateProject = async () => {
  if (!currentOrganization) {
    toast.error('Please select an organization');
    return;
  }

  try {
    const project = await createProjectMutation.mutateAsync({
      project: {
        name: projectName,
        description: projectDescription,
        stage: projectType.toLowerCase().includes('production') ? 'production' : 'concept',
        startDate: startDate?.toISOString(),
        targetDate: expectedEndDate?.toISOString(),
      },
      organizationId: currentOrganization.id,
    });

    // Create initial modules if specified
    if (modules.length > 0) {
      await Promise.all(modules.map(m => 
        modulesService.create({
          project_id: project.id,
          name: m.name,
          module_type: 'software', // Default type
        })
      ));
    }

    // Create initial milestones if specified
    if (milestones.length > 0) {
      await Promise.all(milestones.map(m =>
        milestonesService.create({
          project_id: project.id,
          name: m.name,
          due_date: m.endDate?.toISOString(),
        })
      ));
    }

    toast.success('Project created successfully');
    navigate(`/projects/${project.id}`);
  } catch (error) {
    toast.error('Failed to create project');
  }
};
```

---

### Phase 4: Create Team Members Hook

**New Hook: `src/hooks/useProjectTeam.ts`**

Fetch team members that are available for assignment:

```typescript
export function useProjectTeam() {
  return useQuery({
    queryKey: queryKeys.team.members(),
    queryFn: () => projectsService.getTeamMembers(),
  });
}

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, name, email, avatar_url, initials)
        `)
        .eq('organization_id', orgId);
      
      if (error) throw error;
      return data.map(m => ({
        id: m.profile.id,
        name: m.profile.name,
        email: m.profile.email,
        avatar: m.profile.avatar_url,
        initials: m.profile.initials,
        role: m.role,
      }));
    },
    enabled: !!orgId,
  });
}
```

---

### Phase 5: Update Child Components

The following components receive data as props but may need updates for mutation callbacks:

| Component | Changes Required |
|-----------|-----------------|
| `TasksSection.tsx` | Add `onTaskCreate`, `onTaskUpdate`, `onTaskDelete` props |
| `MilestonesView.tsx` | Already has `onMilestoneUpdate`, `onMilestoneCreate` - connect to mutations |
| `IssuesView.tsx` | Already has `onIssueUpdate`, `onIssueCreate` - connect to mutations |
| `ModulesSection.tsx` | Add `onModuleCreate`, `onModuleUpdate`, `onModuleDelete` - connect to mutations |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useProjectDetail.ts` | Hook for fetching project with all related data |
| `src/hooks/useProjectMutations.ts` | Mutation hooks for tasks, milestones, issues, modules |
| `src/hooks/useProjectTeam.ts` | Hook for fetching team members |
| `src/features/projects/components/ProjectDetailSkeleton.tsx` | Loading skeleton for project detail page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/projects/ProjectDetail.tsx` | Replace mock data with hooks, add loading/error states |
| `src/features/projects/NewProject.tsx` | Connect form to createProject mutation |
| `src/features/projects/components/TasksSection.tsx` | Pass mutation callbacks to child components |
| `src/features/projects/components/KanbanView.tsx` | Add task update/create handlers |
| `src/hooks/useProjects.ts` | Export additional project-related hooks |
| `src/services/index.ts` | Ensure all services are exported |

---

## Data Flow After Integration

```text
User Action (Create Task)
         │
         ▼
   ProjectDetail.tsx
         │
         ▼
  useCreateTask mutation
         │
         ▼
   tasksService.create()
         │
         ▼
   Supabase INSERT
         │
         ▼
  Query Invalidation
         │
         ▼
  useProjectDetail refetches
         │
         ▼
   UI Updates
```

---

## Configuration Update

Ensure these environment variables are set for Supabase mode:

```env
VITE_USE_SUPABASE=true
VITE_USE_MOCK_DATA=false
```

---

## Summary of Changes

### Core Changes
1. Create 3 new hook files for project detail, mutations, and team
2. Create 1 skeleton component for loading state
3. Major refactor of `ProjectDetail.tsx` to use hooks instead of mock data
4. Update `NewProject.tsx` to persist data to database

### Database Operations Covered
- Projects: Create, Read, Update, Delete
- Tasks: Create, Read, Update, Delete, Batch Update
- Milestones: Create, Read, Update, Delete
- Issues: Create, Read, Update, Delete
- Modules: Create, Read, Update, Delete
- Task Assignees: Manage via task mutations
- Issue Assignees: Manage via issue mutations

### UI Improvements
- Loading skeletons for project detail page
- Error handling with user-friendly messages
- Toast notifications for all CRUD operations
- Optimistic updates for better UX

