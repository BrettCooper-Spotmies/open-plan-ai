-- Add RPC functions for soft delete operations
-- These bypass RLS policies while maintaining security through permission checks

-- Soft Delete Task
CREATE OR REPLACE FUNCTION public.soft_delete_task(task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has permission to access the task's project
  IF NOT EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = task_id 
    AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied or Task not found';
  END IF;

  -- Perform the soft delete
  UPDATE tasks 
  SET deleted_at = NOW()
  WHERE id = task_id;
END;
$$;

-- Soft Delete Module
CREATE OR REPLACE FUNCTION public.soft_delete_module(module_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has permission to access the module's project
  IF NOT EXISTS (
    SELECT 1 FROM modules m
    JOIN projects p ON m.project_id = p.id
    WHERE m.id = module_id 
    AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied or Module not found';
  END IF;

  -- Perform the soft delete
  UPDATE modules 
  SET deleted_at = NOW()
  WHERE id = module_id;
END;
$$;

-- Soft Delete Milestone
CREATE OR REPLACE FUNCTION public.soft_delete_milestone(milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has permission to access the milestone's project
  IF NOT EXISTS (
    SELECT 1 FROM milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE m.id = milestone_id 
    AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied or Milestone not found';
  END IF;

  -- Perform the soft delete
  UPDATE milestones 
  SET deleted_at = NOW()
  WHERE id = milestone_id;
END;
$$;

-- Soft Delete Issue
CREATE OR REPLACE FUNCTION public.soft_delete_issue(issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has permission to access the issue's project
  IF NOT EXISTS (
    SELECT 1 FROM issues i
    JOIN projects p ON i.project_id = p.id
    WHERE i.id = issue_id 
    AND public.has_project_access(p.id)
  ) THEN
    RAISE EXCEPTION 'Access Denied or Issue not found';
  END IF;

  -- Perform the soft delete
  UPDATE issues 
  SET deleted_at = NOW()
  WHERE id = issue_id;
END;
$$;
