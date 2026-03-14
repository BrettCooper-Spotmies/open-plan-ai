-- Use generic error messages to avoid leaking resource existence (security)
CREATE OR REPLACE FUNCTION public.soft_delete_project(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_id 
    AND public.has_project_access(id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE projects SET deleted_at = NOW() WHERE id = project_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_task(task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_id AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE tasks SET deleted_at = NOW() WHERE id = task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_module(module_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM modules m
    JOIN projects p ON m.project_id = p.id
    WHERE m.id = module_id AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE modules SET deleted_at = NOW() WHERE id = module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_milestone(milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE m.id = milestone_id AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE milestones SET deleted_at = NOW() WHERE id = milestone_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_issue(issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM issues i
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = issue_id AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
  UPDATE issues SET deleted_at = NOW() WHERE id = issue_id;
END;
$$;
