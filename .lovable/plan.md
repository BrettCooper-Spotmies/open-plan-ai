

# Fix: Team Page Issues (5 Modifications)

## Issues Identified

1. **Team members not loading in project creation** - The `useOrganizationMembers` hook works but may return empty if the `profiles` join fails due to RLS. The `teamMembers` data from this hook is used in the Select dropdown.

2. **"Create new organization" visible to members** - The sidebar org switcher shows the "Create new organization" button to all users regardless of role. Need to check the user's role in the current org and hide it for `member` role.

3. **Projects showing 0, Department blank** - The `teamService.getByOrganization()` fetches `projectCount` per member but the `profiles` table has no `department` column. The `department` field on `TeamMember` is always `undefined`. The "Active" count shows 0 because the status is hardcoded as `'active'` but the stats filter compares against it — this is actually a display issue since status is always `'active'`, so "Active" should match "Total". Looking at the screenshot: Active shows 0 which means members are returned but the `status` field comparison might be off. Actually, looking at the code, `status` is hardcoded to `'active' as const` in the service, so `stats.active` should work. The issue is likely that the `teamService.getAll()` is fetching members from the first org membership rather than the current org. The `useTeamMembers()` hook from `useTeam.ts` calls `teamService.getAll()` which auto-detects org instead of using the current org from context.

4. **Remove "Send Mail" option** - Remove the "Send Email" dropdown menu item from both grid and list views.

5. **Edit team member popup** - Currently the "Edit" dropdown item does nothing. Need to add an edit dialog with editable Department and Role fields, and a read-only Email field.

## Plan

### 1. Fix team members loading in project creation

The `useOrganizationMembers` hook in `useProjectTeam.ts` uses a joined query. If there's an RLS issue with the join, it could return empty. Will verify the hook works correctly and add error handling/logging.

### 2. Hide "Create new organization" for members

In `AppSidebar.tsx`, check the current user's role in the current organization. If the role is `member`, hide the "Create new organization" button. This requires fetching the user's membership role from the `organization_members` table or from the already-loaded team members data.

**Approach**: Use the `organizationsService.getMembers()` or query the current user's role from `organization_members` table. Since the sidebar already has `useOrganization()` context, we'll add a check using the current user's org membership role.

### 3. Fix Projects count and Department

**Projects count**: The `useTeamMembers()` hook calls `teamService.getAll()` which auto-detects the org. Need to update it to use the current organization from context, similar to how we fixed projects scoping.

**Department**: The `profiles` table does not have a `department` column. We need to add a `department` column to either:
- The `profiles` table (user-level department), OR
- The `organization_members` table (per-org department assignment)

Best approach: Add `department` to `organization_members` so a user can have different departments in different orgs. Then update `teamService.getByOrganization()` to read the department from the membership record.

**Active count**: Will also fix the `useTeamMembers` hook in Team.tsx to pass the current org ID so members are scoped correctly.

### 4. Remove "Send Email" option

Remove the `<DropdownMenuItem>` for "Send Email" from both the `MemberCard` component (grid view, line ~197-200) and the list view (line ~533-536) in `Team.tsx`.

### 5. Add Edit Team Member Dialog

Create an edit dialog that opens when clicking "Edit" on a team member. The dialog will have:
- **Email** field (read-only/disabled)
- **Department** field (editable, dropdown with predefined departments)
- **Role** field (editable, dropdown: member/admin)
- Save button that updates `organization_members` (role, department)

## Technical Details

### Database Migration
```sql
ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS department text;

NOTIFY pgrst, 'reload schema';
```

### Files to Change

| File | Change |
|------|--------|
| `supabase/migrations/...` | Add `department` column to `organization_members` |
| `src/features/team/Team.tsx` | Remove "Send Email" items, add edit dialog with department/role fields and read-only email, wire up "Edit" button |
| `src/hooks/useTeam.ts` | Update `useTeamMembers` to accept orgId param; add `useUpdateTeamMember` for editing |
| `src/services/team.service.ts` | Update `getByOrganization()` to include `department` from `organization_members`; add `updateMember()` for department+role |
| `src/components/layout/AppSidebar.tsx` | Hide "Create new organization" for members by checking current user's org role |
| `src/hooks/useProjectTeam.ts` | Verify `useOrganizationMembers` works correctly, add fallback/error logging |

