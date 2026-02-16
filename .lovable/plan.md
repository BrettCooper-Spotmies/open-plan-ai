

# Fix: Scope Projects to Current Organization

## Problem

When switching organizations, the projects list still shows projects from all organizations the user belongs to. The `projectsService.getAll()` query has no `organization_id` filter, and the query cache key `['projects']` doesn't include the org ID, so switching orgs doesn't trigger a new fetch.

## Solution

Three changes are needed:

### 1. `src/services/projects.service.ts` — Filter by organization ID

Update `getAll()` to accept an `organizationId` parameter and add `.eq('organization_id', organizationId)` to the query.

```typescript
async getAll(organizationId?: string): Promise<Project[]> {
  // ... mock data handling ...

  let query = supabase
    .from('projects')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
  // ... rest unchanged
}
```

### 2. `src/lib/queryClient.ts` — Include org ID in query key

Update the projects query key factory so that `all` becomes a function accepting an org ID:

```typescript
projects: {
  all: (orgId?: string) => ['projects', orgId] as const,
  // ... derived keys updated accordingly
},
```

### 3. `src/hooks/useProjects.ts` — Pass current org ID

Update `useProjects()` to read the current organization from context and pass it through:

```typescript
export function useProjects() {
  const { currentOrganization } = useOrganization();
  const setProjects = useProjectStore((state) => state.setProjects);
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: queryKeys.projects.all(orgId),
    queryFn: async () => {
      const projects = await projectsService.getAll(orgId);
      setProjects(projects);
      return projects;
    },
    enabled: !!orgId,
  });
}
```

All other references to `queryKeys.projects.all` in invalidation calls across hooks (useProjects, useTasks, useProjectMutations) will also be updated to pass the org ID consistently.

## Files Changed

| File | Change |
|------|--------|
| `src/services/projects.service.ts` | Add optional `organizationId` param to `getAll()`, filter query |
| `src/lib/queryClient.ts` | Make `projects.all` a function that accepts `orgId` |
| `src/hooks/useProjects.ts` | Pass current org ID to service and query key |
| Other hooks with `queryKeys.projects.all` | Update invalidation calls to include org ID |
