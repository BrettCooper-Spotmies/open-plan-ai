# Two-Part Fix: Org-Scoped Data + Manage Member Organization Access

## Part 1: Scope Dashboard and My Day Data to Current Organization

### Problem

The Dashboard service (`dashboard.service.ts`) picks the **first** organization membership instead of using the currently selected organization. Tasks, issues, activities, and milestones are fetched without filtering by the active org's projects, causing cross-org data leakage. My Day relies on `useProjects()` which was already fixed, but the dashboard queries are independent and still broken.

### Changes

`**src/services/dashboard.service.ts**` — Accept `orgId` parameter instead of auto-detecting it:

- `getStats(orgId)` — use provided orgId; scope tasks/issues/milestones queries to projects within that org using `project_id IN (select id from projects where organization_id = orgId)`
- `getRecentActivity(limit, orgId)` — filter activities by project_id belonging to the org
- `getUpcomingMilestones(limit, orgId)` — filter milestones by project_id belonging to the org
- `getProjectSummaries(orgId)` — use provided orgId instead of auto-detecting

`**src/hooks/useDashboard.ts**` — Read `currentOrganization` from context and pass `orgId` to each service call. Include `orgId` in query keys so cache invalidates on org switch.

`**src/lib/queryClient.ts**` — Update dashboard query key factories to include orgId:

```
dashboard: {
  all: ['dashboard'] as const,
  stats: (orgId?: string) => [..., 'stats', orgId],
  activity: (orgId?: string, limit?: number) => [..., 'activity', orgId, limit],
  milestones: (orgId?: string, limit?: number) => [..., 'milestones', orgId, limit],
  projects: (orgId?: string) => [..., 'projects', orgId],
}
```

**My Day** — Already works correctly since it depends on `useProjects()` which is now org-scoped. No changes needed.

---

## Part 2: Manage Team Member Organization Access

### Problem

Owners who have multiple organizations can have grant or revoke organization access for their team members. Currently, when a member is invited, they join only the current org with no way to add them to other orgs or remove them from one.

### Changes

`**src/features/team/Team.tsx**` — Add a "Manage Organizations" option in the member dropdown menu (visible to owners/admins). Clicking it opens a dialog showing:

- All organizations the owner belongs to (fetched from `OrganizationContext`)
- Checkboxes showing which orgs the selected member currently belongs to
- Owner can toggle access on/off per organization

`**src/services/organizations.service.ts**` — Add a new method:

- `getMemberOrganizations(userId)` — fetches all `organization_members` rows for a given user, returning which orgs they belong to

`**src/hooks/useTeam.ts**` — Add new mutations:

- `useAddMemberToOrg()` — calls `organizationsService.addMember(orgId, userId, role)`
- `useRemoveMemberFromOrg()` — calls `organizationsService.removeMember(orgId, userId)`
- `useMemberOrganizations(userId)` — query to fetch which orgs a member belongs to

**New component: `src/features/team/components/ManageOrgAccessDialog.tsx**`

- Shows list of all owner's organizations
- Each org has a toggle/checkbox showing if the member has access
- Toggling on adds the member; toggling off removes them
- Cannot remove from the last remaining org (safety check)
- Cannot remove self (owner) from any org through this dialog

### Database

No schema changes needed — `organization_members` table already supports multiple org memberships per user. The existing `addMember` and `removeMember` methods in `organizationsService` handle the inserts/deletes. RLS policies already allow org admins/owners to manage membership.

---

## Summary of Files Changed


| File                                                     | Change                                                  |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `src/services/dashboard.service.ts`                      | Accept orgId param, scope all queries to org's projects |
| `src/hooks/useDashboard.ts`                              | Pass currentOrganization.id to service and query keys   |
| `src/lib/queryClient.ts`                                 | Add orgId to dashboard query key factories              |
| `src/services/organizations.service.ts`                  | Add `getMemberOrganizations(userId)` method             |
| `src/hooks/useTeam.ts`                                   | Add org access mutations and query                      |
| `src/features/team/Team.tsx`                             | Add "Manage Organizations" menu item in member dropdown |
| `src/features/team/components/ManageOrgAccessDialog.tsx` | New dialog for toggling org access per member           |
