-- =====================================================
-- Enable RLS on ALL tables
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Security Definer Functions (for RLS policies)
-- =====================================================

-- Check if user has a specific app role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Check if user is a member of an organization
CREATE OR REPLACE FUNCTION public.has_org_access(_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
  )
$$;

-- Check if user has a specific role in an organization
CREATE OR REPLACE FUNCTION public.has_org_role(_org_id UUID, _role org_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE organization_id = _org_id
      AND user_id = auth.uid()
      AND role = _role
  )
$$;

-- Check if user can access a project (via org membership)
CREATE OR REPLACE FUNCTION public.has_project_access(_proj_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    JOIN public.organization_members om ON om.organization_id = p.organization_id
    WHERE p.id = _proj_id
      AND om.user_id = auth.uid()
      AND p.deleted_at IS NULL
  )
$$;

-- Get organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.organization_members
  WHERE user_id = auth.uid()
$$;

-- =====================================================
-- RLS Policies: profiles
-- =====================================================
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- RLS Policies: user_roles
-- =====================================================
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only admins can modify roles (handled via edge functions in prod)
CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS Policies: organizations
-- =====================================================
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (public.has_org_access(id) AND deleted_at IS NULL);

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Org owners/admins can update organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    public.has_org_role(id, 'owner') 
    OR public.has_org_role(id, 'admin')
  );

CREATE POLICY "Org owners can delete organization"
  ON organizations FOR DELETE
  TO authenticated
  USING (public.has_org_role(id, 'owner'));

-- =====================================================
-- RLS Policies: organization_members
-- =====================================================
CREATE POLICY "Users can view members of their organizations"
  ON organization_members FOR SELECT
  TO authenticated
  USING (public.has_org_access(organization_id));

CREATE POLICY "Users can join organizations they create"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_org_role(organization_id, 'owner') OR public.has_org_role(organization_id, 'admin'));

CREATE POLICY "Org owners/admins can update members"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    public.has_org_role(organization_id, 'owner') 
    OR public.has_org_role(organization_id, 'admin')
  );

CREATE POLICY "Org owners/admins can remove members"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() -- Users can leave
    OR public.has_org_role(organization_id, 'owner')
    OR public.has_org_role(organization_id, 'admin')
  );

-- =====================================================
-- RLS Policies: projects
-- =====================================================
CREATE POLICY "Users can view projects in their orgs"
  ON projects FOR SELECT
  TO authenticated
  USING (public.has_org_access(organization_id) AND deleted_at IS NULL);

CREATE POLICY "Org members can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_access(organization_id));

CREATE POLICY "Project access for updates"
  ON projects FOR UPDATE
  TO authenticated
  USING (public.has_project_access(id));

CREATE POLICY "Project access for deletes"
  ON projects FOR DELETE
  TO authenticated
  USING (public.has_project_access(id));

-- =====================================================
-- RLS Policies: project_members
-- =====================================================
CREATE POLICY "Users can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Project admins can manage members"
  ON project_members FOR ALL
  TO authenticated
  USING (public.has_project_access(project_id));

-- =====================================================
-- RLS Policies: modules
-- =====================================================
CREATE POLICY "Users can view modules in accessible projects"
  ON modules FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create modules in accessible projects"
  ON modules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(project_id));

CREATE POLICY "Users can update modules in accessible projects"
  ON modules FOR UPDATE
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can delete modules in accessible projects"
  ON modules FOR DELETE
  TO authenticated
  USING (public.has_project_access(project_id));

-- =====================================================
-- RLS Policies: milestones
-- =====================================================
CREATE POLICY "Users can view milestones in accessible projects"
  ON milestones FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create milestones in accessible projects"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(project_id));

CREATE POLICY "Users can update milestones in accessible projects"
  ON milestones FOR UPDATE
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can delete milestones in accessible projects"
  ON milestones FOR DELETE
  TO authenticated
  USING (public.has_project_access(project_id));

-- =====================================================
-- RLS Policies: tasks
-- =====================================================
CREATE POLICY "Users can view tasks in accessible projects"
  ON tasks FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create tasks in accessible projects"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(project_id));

CREATE POLICY "Users can update tasks in accessible projects"
  ON tasks FOR UPDATE
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can delete tasks in accessible projects"
  ON tasks FOR DELETE
  TO authenticated
  USING (public.has_project_access(project_id));

-- =====================================================
-- RLS Policies: task_assignees
-- =====================================================
CREATE POLICY "Users can view task assignees"
  ON task_assignees FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

CREATE POLICY "Users can manage task assignees"
  ON task_assignees FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

-- =====================================================
-- RLS Policies: task_dependencies
-- =====================================================
CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

CREATE POLICY "Users can manage task dependencies"
  ON task_dependencies FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

-- =====================================================
-- RLS Policies: checklists
-- =====================================================
CREATE POLICY "Users can view checklists"
  ON checklists FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

CREATE POLICY "Users can manage checklists"
  ON checklists FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)
  ));

-- =====================================================
-- RLS Policies: issues
-- =====================================================
CREATE POLICY "Users can view issues in accessible projects"
  ON issues FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id) AND deleted_at IS NULL);

CREATE POLICY "Users can create issues in accessible projects"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(project_id));

CREATE POLICY "Users can update issues in accessible projects"
  ON issues FOR UPDATE
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can delete issues in accessible projects"
  ON issues FOR DELETE
  TO authenticated
  USING (public.has_project_access(project_id));

-- =====================================================
-- RLS Policies: issue_assignees
-- =====================================================
CREATE POLICY "Users can view issue assignees"
  ON issue_assignees FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)
  ));

CREATE POLICY "Users can manage issue assignees"
  ON issue_assignees FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)
  ));

-- =====================================================
-- RLS Policies: comments
-- =====================================================
CREATE POLICY "Users can view comments on accessible entities"
  ON comments FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- =====================================================
-- RLS Policies: attachments
-- =====================================================
CREATE POLICY "Users can view attachments"
  ON attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create attachments"
  ON attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own attachments"
  ON attachments FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- =====================================================
-- RLS Policies: activities
-- =====================================================
CREATE POLICY "Users can view activities in accessible projects"
  ON activities FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can create activities in accessible projects"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (public.has_project_access(project_id));