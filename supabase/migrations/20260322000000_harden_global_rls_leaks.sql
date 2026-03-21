-- 1. Create optimized RPC for Dashboard Stats to avoid massive array fetching limits
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_org_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_access BOOLEAN;
    v_active_projects INT;
    v_total_tasks INT;
    v_completed_tasks INT;
    v_open_issues INT;
    v_team_members INT;
    v_overdue_items INT;
    v_in_progress_tasks INT;
BEGIN
    -- Verify the caller is a member of this organization
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = auth.uid()
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Aggregate active projects
    SELECT COUNT(*) INTO v_active_projects 
    FROM public.projects 
    WHERE organization_id = p_org_id AND deleted_at IS NULL;

    -- If no projects, return zeroes
    IF v_active_projects = 0 THEN
        RETURN jsonb_build_object(
            'activeProjects', 0,
            'totalTasks', 0,
            'completedTasks', 0,
            'openIssues', 0,
            'teamMembers', 0,
            'overdueItems', 0,
            'inProgressTasks', 0
        );
    END IF;

    -- Aggregate tasks statistics globally by org lookup directly
    SELECT 
        COUNT(t.id),
        COUNT(t.id) FILTER (WHERE t.status = 'done'),
        COUNT(t.id) FILTER (WHERE t.status = 'in-progress'),
        COUNT(t.id) FILTER (WHERE t.status != 'done' AND t.due_date < CURRENT_DATE)
    INTO v_total_tasks, v_completed_tasks, v_in_progress_tasks, v_overdue_items
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE p.organization_id = p_org_id 
      AND p.deleted_at IS NULL 
      AND t.deleted_at IS NULL;

    -- Aggregate open issues
    SELECT COUNT(i.id) INTO v_open_issues
    FROM public.issues i
    JOIN public.projects p ON p.id = i.project_id
    WHERE p.organization_id = p_org_id 
      AND p.deleted_at IS NULL 
      AND i.deleted_at IS NULL 
      AND i.status IN ('open', 'investigating');

    -- Aggregate team members count
    SELECT COUNT(*) INTO v_team_members
    FROM public.organization_members
    WHERE organization_id = p_org_id;

    RETURN jsonb_build_object(
        'activeProjects', v_active_projects,
        'totalTasks', v_total_tasks,
        'completedTasks', v_completed_tasks,
        'openIssues', v_open_issues,
        'teamMembers', v_team_members,
        'overdueItems', v_overdue_items,
        'inProgressTasks', v_in_progress_tasks
    );
END;
$$;

-- Secure the Dashboard Stats RPC
REVOKE ALL ON FUNCTION public.get_dashboard_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID) TO authenticated;

-- 2. Lockdown Permissive RLS Policies on "comments"
DROP POLICY IF EXISTS "Users can view comments on accessible entities" ON public.comments;
CREATE POLICY "Users can view comments on accessible entities"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- If entity is task, check project access via tasks table
      (entity_type = 'task' AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = entity_id AND public.has_project_access(t.project_id)))
      OR
      -- If entity is issue, check project access via issues table
      (entity_type = 'issue' AND EXISTS (SELECT 1 FROM public.issues i WHERE i.id = entity_id AND public.has_project_access(i.project_id)))
      OR
      -- If entity is project, check project access natively
      (entity_type = 'project' AND public.has_project_access(entity_id))
    )
  );

-- 3. Lockdown Permissive RLS Policies on "attachments"
DROP POLICY IF EXISTS "Users can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can view attachments on accessible entities" ON public.attachments;
CREATE POLICY "Users can view attachments on accessible entities"
  ON public.attachments FOR SELECT
  TO authenticated
  USING (
    (entity_type = 'task' AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = entity_id AND public.has_project_access(t.project_id)))
    OR
    (entity_type = 'issue' AND EXISTS (SELECT 1 FROM public.issues i WHERE i.id = entity_id AND public.has_project_access(i.project_id)))
    OR
    (entity_type = 'project' AND public.has_project_access(entity_id))
  );

-- 4. Lockdown Permissive Tracking Tables (issue_dependencies)
DROP POLICY IF EXISTS "Users can view issue dependencies" ON public.issue_dependencies;
CREATE POLICY "Users can view issue dependencies"
  ON public.issue_dependencies FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)));

DROP POLICY IF EXISTS "Users can manage issue dependencies" ON public.issue_dependencies;
CREATE POLICY "Users can manage issue dependencies"
  ON public.issue_dependencies FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)));

-- issue_task_dependencies
DROP POLICY IF EXISTS "Users can view issue-task dependencies" ON public.issue_task_dependencies;
CREATE POLICY "Users can view issue-task dependencies"
  ON public.issue_task_dependencies FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)));

DROP POLICY IF EXISTS "Users can manage issue-task dependencies" ON public.issue_task_dependencies;
CREATE POLICY "Users can manage issue-task dependencies"
  ON public.issue_task_dependencies FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.issues i WHERE i.id = issue_id AND public.has_project_access(i.project_id)));

-- task_issue_dependencies
DROP POLICY IF EXISTS "Users can view task-issue dependencies" ON public.task_issue_dependencies;
CREATE POLICY "Users can view task-issue dependencies"
  ON public.task_issue_dependencies FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)));

DROP POLICY IF EXISTS "Users can manage task-issue dependencies" ON public.task_issue_dependencies;
CREATE POLICY "Users can manage task-issue dependencies"
  ON public.task_issue_dependencies FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_project_access(t.project_id)));
