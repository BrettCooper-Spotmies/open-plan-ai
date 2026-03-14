-- Secure Soft Delete Functions using single-query patterns and GET DIAGNOSTICS
-- This migration hardens the soft-delete RPCs against race conditions and unauthorized access.

-- 1. Soft Delete Project
DROP FUNCTION IF EXISTS public.soft_delete_project(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_project(p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE projects 
  SET deleted_at = NOW() 
  WHERE id = p_project_id 
    AND public.has_project_access(id);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Project not found';
  END IF;
END;
$$;

-- 2. Soft Delete Task
DROP FUNCTION IF EXISTS public.soft_delete_task(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_task(p_task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE tasks 
  SET deleted_at = NOW() 
  WHERE id = p_task_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Task not found';
  END IF;
END;
$$;

-- 3. Soft Delete Module
DROP FUNCTION IF EXISTS public.soft_delete_module(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_module(p_module_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE modules 
  SET deleted_at = NOW() 
  WHERE id = p_module_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = modules.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Module not found';
  END IF;
END;
$$;

-- 4. Soft Delete Milestone
DROP FUNCTION IF EXISTS public.soft_delete_milestone(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_milestone(p_milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE milestones 
  SET deleted_at = NOW() 
  WHERE id = p_milestone_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = milestones.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Milestone not found';
  END IF;
END;
$$;

-- 5. Soft Delete Issue
DROP FUNCTION IF EXISTS public.soft_delete_issue(UUID);
CREATE OR REPLACE FUNCTION public.soft_delete_issue(p_issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE issues 
  SET deleted_at = NOW() 
  WHERE id = p_issue_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = issues.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Issue not found';
  END IF;
END;
$$;

-- 6. Batch Soft Delete Modules
DROP FUNCTION IF EXISTS public.batch_soft_delete_modules(UUID[]);
CREATE OR REPLACE FUNCTION public.batch_soft_delete_modules(module_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE modules 
  SET deleted_at = NOW() 
  WHERE id = ANY(module_ids) 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = modules.project_id 
        AND public.has_project_access(p.id)
    );
END;
$$;

-- 7. Batch Soft Delete Milestones
DROP FUNCTION IF EXISTS public.batch_soft_delete_milestones(UUID[]);
CREATE OR REPLACE FUNCTION public.batch_soft_delete_milestones(milestone_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE milestones 
  SET deleted_at = NOW() 
  WHERE id = ANY(milestone_ids) 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = milestones.project_id 
        AND public.has_project_access(p.id)
    );
END;
$$;
