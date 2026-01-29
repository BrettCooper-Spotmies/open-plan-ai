
# Backend Integration for Project Creation Form

## Summary
The project creation form has UI for file attachments, team assignment, and project links, but the backend integration is incomplete. Files are uploaded to blob storage but not tracked in the database, team members aren't assigned to projects, and there's no storage for project links.

## Changes Overview

### 1. Database Schema Changes

**Create `project_links` table** for storing external links:
- `id` (UUID, primary key)
- `project_id` (UUID, foreign key to projects)
- `name` (text) - Display name for the link
- `url` (text) - The actual URL
- `created_by` (UUID, foreign key to profiles)
- `created_at` (timestamp)
- `deleted_at` (timestamp, for soft delete)

**Add RLS policies** for the new table:
- SELECT: Users with project access can view links
- INSERT: Users with project access can create links
- UPDATE: Users with project access can update links
- DELETE: Users with project access can delete links

### 2. Service Layer Updates

**Create `attachmentsService`** (new file: `src/services/attachments.service.ts`):
- `create()` - Insert attachment metadata after file upload
- `getByProject()` - List all attachments for a project
- `getByEntity()` - List attachments for a specific task/issue
- `delete()` - Soft delete attachment record and file from storage

**Create `projectLinksService`** (new file: `src/services/projectLinks.service.ts`):
- `create()` - Add a new link to a project
- `getByProject()` - List all links for a project
- `update()` - Update link name/URL
- `delete()` - Remove a link

**Update `projectStorageService`**:
- Integrate with `attachmentsService` to persist metadata after upload
- Add method to upload and track in one operation

**Create `projectMembersService`** (new file: `src/services/projectMembers.service.ts`):
- `addMember()` - Add a team member to a project with a role
- `addMembers()` - Batch add multiple members
- `removeMember()` - Remove a member from a project
- `updateRole()` - Update a member's project role
- `getByProject()` - Get all members for a project

### 3. Project Creation Flow Integration

**Update `NewProject.tsx` to use new services**:
After project creation:
1. Upload files to storage using `projectStorageService`
2. Create attachment records using `attachmentsService.create()` with `entity_type: 'project'`
3. Add team members using `projectMembersService.addMembers()`
4. Create project links using `projectLinksService.create()`

### 4. Hook Updates

**Create custom hooks**:
- `useProjectAttachments(projectId)` - Query attachments for a project
- `useProjectLinks(projectId)` - Query links for a project  
- `useProjectMembers(projectId)` - Already exists in `useProjectTeam.ts`

---

## Technical Details

### Database Migration SQL

```text
-- Create project_links table
CREATE TABLE public.project_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX idx_project_links_project_id ON public.project_links(project_id);

-- RLS Policies
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view links in accessible projects"
ON public.project_links FOR SELECT
USING (has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create links in accessible projects"
ON public.project_links FOR INSERT
WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update links in accessible projects"
ON public.project_links FOR UPDATE
USING (has_project_access(project_id));

CREATE POLICY "Users can delete links in accessible projects"
ON public.project_links FOR DELETE
USING (has_project_access(project_id));
```

### Service Files Structure

```text
src/services/
├── attachments.service.ts    (new)
├── projectLinks.service.ts   (new)
├── projectMembers.service.ts (new)
├── projectStorage.service.ts (update)
├── projects.service.ts       (update)
└── index.ts                  (update exports)
```

### Updated Project Creation Flow

```text
1. User submits form
2. Create project in database → get projectId
3. Create modules (existing)
4. Create milestones (existing)
5. Upload files to storage
   └── For each file: create attachment record with entity_type='project'
6. Add team members to project_members table
7. Create project links in project_links table
8. Navigate to project detail page
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/xxx_add_project_links.sql` | Create |
| `src/services/attachments.service.ts` | Create |
| `src/services/projectLinks.service.ts` | Create |
| `src/services/projectMembers.service.ts` | Create |
| `src/services/projectStorage.service.ts` | Update |
| `src/services/index.ts` | Update |
| `src/features/projects/NewProject.tsx` | Update |
| `src/hooks/useProjectAttachments.ts` | Create |
| `src/hooks/useProjectLinks.ts` | Create |
