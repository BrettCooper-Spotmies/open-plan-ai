

# Supabase Production Integration Plan

## Executive Summary

This plan integrates Supabase as the production backend for OpenPlan AI, implementing a multi-tenant, organization-scoped architecture with full Row Level Security, proper authentication, storage, and realtime capabilities.

**Estimated Implementation Time:** 15-20 hours across multiple phases

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Components  │  Hooks (React Query)  │  Stores (Zustand)        │
├─────────────────────────────────────────────────────────────────┤
│                    Services Layer (Abstraction)                 │
│  projectsService  │  tasksService  │  issuesService  │  auth    │
├─────────────────────────────────────────────────────────────────┤
│                    Supabase Client (Singleton)                  │
├─────────────────────────────────────────────────────────────────┤
│  Auth  │  Database (Postgres)  │  Storage  │  Realtime  │  Edge │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation Setup

### 1.1 Supabase Client Configuration

**New File:** `src/lib/supabase.ts`

Creates a singleton Supabase client with:
- Environment variable configuration
- Type-safe database types
- Auth state persistence
- Helper utilities

```typescript
// Key exports:
export const supabase = createClient<Database>(url, key, options);
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
```

### 1.2 Database Types Generation

**New File:** `src/types/database.types.ts`

Auto-generated TypeScript types matching the database schema. This will be generated from Supabase CLI after schema creation.

### 1.3 Configuration Update

**File:** `src/config/index.ts`

Already has Supabase config placeholders - will verify usage:
```typescript
supabase: {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
}
```

---

## Phase 2: Database Schema Design

### 2.1 Core Tables Structure

| Table | Description | Key Relationships |
|-------|-------------|-------------------|
| `profiles` | User profile data | FK to auth.users |
| `organizations` | Tenant/workspace entities | - |
| `organization_members` | User-org membership + roles | FK to profiles, organizations |
| `user_roles` | Role assignments | FK to auth.users |
| `projects` | Projects within orgs | FK to organizations |
| `project_members` | Project access control | FK to projects, profiles |
| `tasks` | Task entities | FK to projects, modules, milestones |
| `modules` | Module entities | FK to projects |
| `milestones` | Milestone entities | FK to projects |
| `issues` | Issue tracking | FK to projects, modules |
| `comments` | Comments on any entity | Polymorphic FK |
| `attachments` | File references | Polymorphic FK |
| `activities` | Activity feed | FK to projects |
| `checklists` | Checklist items | FK to tasks |
| `task_assignees` | Task-user junction | FK to tasks, profiles |
| `issue_assignees` | Issue-user junction | FK to issues, profiles |
| `task_dependencies` | Task blocking relationships | Self-referential FK |

### 2.2 Enum Types

```sql
-- Role enums
CREATE TYPE app_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE project_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Domain enums (matching existing TypeScript types)
CREATE TYPE task_status AS ENUM ('todo', 'in-progress', 'review', 'done', 'blocked');
CREATE TYPE priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE module_type AS ENUM ('hardware', 'software', 'firmware', 'testing', 'design', 'procurement', 'manufacturing', 'qa', 'logistics', 'enclosure', 'pcb', 'power');
CREATE TYPE project_stage AS ENUM ('concept', 'design', 'development', 'testing', 'production');
CREATE TYPE issue_severity AS ENUM ('critical', 'major', 'minor', 'trivial');
CREATE TYPE issue_status AS ENUM ('open', 'investigating', 'resolved', 'closed', 'wont-fix');
CREATE TYPE issue_category AS ENUM ('defect', 'risk', 'supplier', 'compliance', 'test-failure', 'design-change', 'other');
CREATE TYPE activity_type AS ENUM ('task_created', 'task_completed', 'task_updated', 'comment_added', 'milestone_reached', 'status_changed', 'issue_created', 'issue_resolved');
```

### 2.3 Table Definitions (Key Tables)

**profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**organizations**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

**organization_members**
```sql
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

**projects**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  stage project_stage NOT NULL DEFAULT 'concept',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  target_date DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;
```

**tasks**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority priority NOT NULL DEFAULT 'medium',
  module_type module_type,
  due_date DATE,
  start_date DATE,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assignee ON task_assignees(user_id);
```

### 2.4 Junction Tables

**task_assignees**
```sql
CREATE TABLE task_assignees (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  PRIMARY KEY (task_id, user_id)
);
```

**task_dependencies**
```sql
CREATE TABLE task_dependencies (
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, depends_on_id),
  CHECK (task_id != depends_on_id)
);
```

---

## Phase 3: Security Model (RLS)

### 3.1 Security Definer Functions

**Required helper functions for RLS:**

```sql
-- Check organization membership
CREATE OR REPLACE FUNCTION has_org_access(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check organization role
CREATE OR REPLACE FUNCTION has_org_role(org_id UUID, required_role org_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = required_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check project access
CREATE OR REPLACE FUNCTION has_project_access(proj_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = proj_id
    AND om.user_id = auth.uid()
    AND p.deleted_at IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get user's current organization
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

### 3.2 RLS Policies

**Organizations:**
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organizations"
ON organizations FOR SELECT
TO authenticated
USING (has_org_access(id));

CREATE POLICY "Org owners/admins can update"
ON organizations FOR UPDATE
TO authenticated
USING (has_org_role(id, 'owner') OR has_org_role(id, 'admin'));
```

**Projects:**
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their orgs"
ON projects FOR SELECT
TO authenticated
USING (has_org_access(organization_id) AND deleted_at IS NULL);

CREATE POLICY "Org members can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (has_org_access(organization_id));

CREATE POLICY "Project access for updates"
ON projects FOR UPDATE
TO authenticated
USING (has_project_access(id));
```

**Tasks:**
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in accessible projects"
ON tasks FOR SELECT
TO authenticated
USING (has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create tasks in accessible projects"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (has_project_access(project_id));

CREATE POLICY "Users can update tasks in accessible projects"
ON tasks FOR UPDATE
TO authenticated
USING (has_project_access(project_id));

CREATE POLICY "Users can delete tasks in accessible projects"
ON tasks FOR DELETE
TO authenticated
USING (has_project_access(project_id));
```

### 3.3 User Roles Table (Per Security Requirements)

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION has_role(required_role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = required_role
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;
```

---

## Phase 4: Authentication Layer

### 4.1 Auth Service

**New File:** `src/services/auth.service.ts`

```typescript
// Key functions:
- signUp(email, password, metadata)
- signIn(email, password)
- signOut()
- resetPassword(email)
- updatePassword(newPassword)
- getSession()
- getUser()
- onAuthStateChange(callback)
```

### 4.2 Auth Provider Context

**New File:** `src/contexts/AuthContext.tsx`

Provides:
- Current user state
- Loading state
- Auth methods
- Session management
- Integration with useUserStore

```typescript
interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

### 4.3 Protected Route Component

**New File:** `src/components/ProtectedRoute.tsx`

- Wraps authenticated routes
- Redirects to login if not authenticated
- Shows loading state during auth check

### 4.4 Profile Auto-Creation Trigger

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, initials)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

---

## Phase 5: Storage Integration

### 5.1 Storage Bucket Setup

```sql
-- Create attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false);

-- RLS for storage
CREATE POLICY "Users can upload to org projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  -- Path format: org/{orgId}/project/{projectId}/...
  has_org_access((storage.foldername(name))[2]::uuid)
);

CREATE POLICY "Users can view attachments in their projects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' AND
  has_org_access((storage.foldername(name))[2]::uuid)
);
```

### 5.2 Storage Service

**New File:** `src/services/storage.service.ts`

```typescript
// Key functions:
- uploadAttachment(orgId, projectId, entityType, entityId, file)
- getAttachmentUrl(path)
- deleteAttachment(path)
- listAttachments(orgId, projectId, entityType, entityId)
```

---

## Phase 6: Service Layer Updates

### 6.1 Service Architecture Pattern

Each service will follow this pattern:

```typescript
// src/services/projects.service.ts
import { supabase } from '@/lib/supabase';
import { config } from '@/config';

const USE_SUPABASE = config.api.useSupabase;

export const projectsService = {
  async getAll(): Promise<Project[]> {
    if (!USE_SUPABASE) {
      return mockProjectsService.getAll();
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(name),
        tasks(count),
        milestones(count)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return mapDbProjectsToModel(data);
  },
  // ... other methods
};
```

### 6.2 Services to Update

| Service | Current State | Update Required |
|---------|--------------|-----------------|
| `projects.service.ts` | Mock data | Add Supabase queries |
| `tasks.service.ts` | Mock data | Add Supabase queries |
| `issues.service.ts` | Mock data | Add Supabase queries |
| `auth.service.ts` | New | Create with Supabase Auth |
| `storage.service.ts` | New | Create for file uploads |
| `milestones.service.ts` | New | Create for milestones CRUD |
| `modules.service.ts` | New | Create for modules CRUD |
| `organizations.service.ts` | New | Create for org management |

### 6.3 Type Mappers

**New File:** `src/services/mappers/index.ts`

Converts between database types and frontend types:

```typescript
export function mapDbTaskToModel(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    status: dbTask.status,
    priority: dbTask.priority,
    assignees: dbTask.task_assignees?.map(mapDbProfileToTeamMember) ?? [],
    // ... mapping logic
  };
}
```

---

## Phase 7: Query Keys & Hooks Updates

### 7.1 Extended Query Keys

**File:** `src/lib/queryClient.ts`

Add new query keys for:
- Organizations
- Current user profile
- Organization members
- Storage/attachments

### 7.2 New Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Auth operations and state |
| `useCurrentUser` | Current user profile |
| `useOrganization` | Current org context |
| `useOrganizations` | List user's orgs |
| `useProjectMembers` | Project team management |
| `useMilestones` | Milestone CRUD |
| `useModules` | Module CRUD |
| `useAttachments` | File management |

---

## Phase 8: Realtime Preparation

### 8.1 Realtime Subscriptions Hook

**New File:** `src/hooks/useRealtimeSubscription.ts`

```typescript
export function useTaskUpdates(projectId: string) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`tasks:${projectId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        (payload) => {
          // Invalidate or update cache
          queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list(projectId) });
        }
      )
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);
}
```

### 8.2 Tables with Realtime Enabled

- `tasks` - For kanban updates
- `issues` - For issue status changes
- `comments` - For real-time collaboration
- `activities` - For activity feed

---

## Phase 9: App Integration

### 9.1 App.tsx Updates

Wrap app with AuthProvider:

```typescript
<AuthProvider>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          {/* ... other routes */}
        </Route>
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
</AuthProvider>
```

### 9.2 Login/Signup Page Updates

Update existing pages to use real Supabase auth:

- `Login.tsx` - Call authService.signIn
- `Signup.tsx` - Call authService.signUp with company metadata
- `ForgotPassword.tsx` - Call authService.resetPassword

---

## Implementation Order

| Phase | Description | Time Est. |
|-------|-------------|-----------|
| 1 | Foundation Setup (client, types) | 1 hour |
| 2 | Database Schema (migrations) | 3 hours |
| 3 | Security Model (RLS policies) | 2 hours |
| 4 | Authentication Layer | 3 hours |
| 5 | Storage Integration | 1 hour |
| 6 | Service Layer Updates | 4 hours |
| 7 | Hooks & Query Keys | 2 hours |
| 8 | Realtime Preparation | 1 hour |
| 9 | App Integration & Testing | 3 hours |
| **Total** | | **~20 hours** |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/types/database.types.ts` | Generated DB types |
| `src/services/auth.service.ts` | Authentication service |
| `src/services/storage.service.ts` | File storage service |
| `src/services/organizations.service.ts` | Organization management |
| `src/services/milestones.service.ts` | Milestones CRUD |
| `src/services/modules.service.ts` | Modules CRUD |
| `src/services/mappers/index.ts` | DB-to-model mappers |
| `src/contexts/AuthContext.tsx` | Auth context provider |
| `src/contexts/OrganizationContext.tsx` | Org context provider |
| `src/components/ProtectedRoute.tsx` | Route guard |
| `src/hooks/useAuth.ts` | Auth hook |
| `src/hooks/useOrganization.ts` | Organization hook |
| `src/hooks/useRealtimeSubscription.ts` | Realtime hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add AuthProvider, ProtectedRoute |
| `src/config/index.ts` | Verify Supabase config |
| `src/lib/queryClient.ts` | Add new query keys |
| `src/services/projects.service.ts` | Add Supabase implementation |
| `src/services/tasks.service.ts` | Add Supabase implementation |
| `src/services/issues.service.ts` | Add Supabase implementation |
| `src/services/index.ts` | Export new services |
| `src/stores/useUserStore.ts` | Integrate with auth |
| `src/pages/Login.tsx` | Use real auth |
| `src/pages/Signup.tsx` | Use real auth |
| `src/types/index.ts` | Add organization types |

---

## Database Migrations Summary

Will create these migration files:

1. `001_create_enums.sql` - All enum types
2. `002_create_profiles.sql` - Profiles table + trigger
3. `003_create_user_roles.sql` - Roles table
4. `004_create_organizations.sql` - Organizations + members
5. `005_create_projects.sql` - Projects + members
6. `006_create_modules.sql` - Modules table
7. `007_create_milestones.sql` - Milestones table
8. `008_create_tasks.sql` - Tasks + assignees + dependencies
9. `009_create_issues.sql` - Issues + assignees
10. `010_create_comments.sql` - Comments (polymorphic)
11. `011_create_attachments.sql` - Attachments table
12. `012_create_activities.sql` - Activity feed
13. `013_create_checklists.sql` - Checklist items
14. `014_rls_security_functions.sql` - Security definer functions
15. `015_rls_policies.sql` - All RLS policies
16. `016_storage_setup.sql` - Storage buckets + policies
17. `017_indexes.sql` - Performance indexes

---

## Success Criteria

After implementation:
- User can sign up and create an organization
- User can create/join organizations
- Projects are scoped to organizations
- RLS prevents cross-tenant data access
- All CRUD operations work through services
- File uploads work via Supabase Storage
- Auth persists across sessions
- Realtime ready for future activation
- Zero direct Supabase calls from components

