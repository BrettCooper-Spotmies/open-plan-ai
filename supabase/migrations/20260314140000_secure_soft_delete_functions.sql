-- Secure Soft Delete and Batch Update Functions
-- This migration hardens the RPCs against race conditions and unauthorized access.
-- We drop existing functions first to allow changing parameter names without "42P13" errors.

DROP FUNCTION IF EXISTS public.soft_delete_project(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_task(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_module(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_milestone(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_issue(uuid);
DROP FUNCTION IF EXISTS public.batch_soft_delete_modules(uuid[]);
DROP FUNCTION IF EXISTS public.batch_soft_delete_milestones(uuid[]);
DROP FUNCTION IF EXISTS public.batch_update_tasks(jsonb);
DROP FUNCTION IF EXISTS public.batch_update_modules(jsonb);
DROP FUNCTION IF EXISTS public.batch_update_milestones(jsonb);

-- 1. Soft Delete Project
CREATE OR REPLACE FUNCTION public.soft_delete_project(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE projects p
  SET deleted_at = NOW() 
  WHERE p.id = project_id 
    AND public.has_project_access(p.id);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Project not found';
  END IF;
END;
$$;

-- 2. Soft Delete Task
CREATE OR REPLACE FUNCTION public.soft_delete_task(task_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE tasks t
  SET deleted_at = NOW() 
  WHERE t.id = task_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = t.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Task not found';
  END IF;
END;
$$;

-- 3. Soft Delete Module
CREATE OR REPLACE FUNCTION public.soft_delete_module(module_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE modules m
  SET deleted_at = NOW() 
  WHERE m.id = module_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = m.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Module not found';
  END IF;
END;
$$;

-- 4. Soft Delete Milestone
CREATE OR REPLACE FUNCTION public.soft_delete_milestone(milestone_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE milestones m
  SET deleted_at = NOW() 
  WHERE m.id = milestone_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = m.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Milestone not found';
  END IF;
END;
$$;

-- 5. Soft Delete Issue
CREATE OR REPLACE FUNCTION public.soft_delete_issue(issue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE issues i
  SET deleted_at = NOW() 
  WHERE i.id = issue_id 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = i.project_id 
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied or Issue not found';
  END IF;
END;
$$;

-- 6. Batch Soft Delete Modules
CREATE OR REPLACE FUNCTION public.batch_soft_delete_modules(module_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE modules m
  SET deleted_at = NOW() 
  WHERE m.id = ANY(module_ids) 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = m.project_id 
        AND public.has_project_access(p.id)
    );
END;
$$;

-- 7. Batch Soft Delete Milestones
CREATE OR REPLACE FUNCTION public.batch_soft_delete_milestones(milestone_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE milestones m
  SET deleted_at = NOW() 
  WHERE m.id = ANY(milestone_ids) 
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = m.project_id 
        AND public.has_project_access(p.id)
    );
END;
$$;

-- 8. Secure Batch Update Tasks (from previous migration)
CREATE OR REPLACE FUNCTION public.batch_update_tasks(updates jsonb)
RETURNS void AS $$
DECLARE
  task_record jsonb;
BEGIN
  FOR task_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Security check: Ensure user has access to the project associated with this task
    IF EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = (task_record->>'id')::uuid 
        AND public.has_project_access(p.id)
    ) THEN
      UPDATE tasks
      SET
        status = COALESCE((task_record->>'status')::text, status),
        priority = COALESCE((task_record->>'priority')::text, priority),
        milestone_id = CASE
          WHEN task_record ? 'milestoneId' THEN (task_record->>'milestoneId')::uuid
          WHEN task_record ? 'milestone_id' THEN (task_record->>'milestone_id')::uuid
          ELSE milestone_id
        END,
        updated_at = now()
      WHERE id = (task_record->>'id')::uuid;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Secure Batch Update Modules (from previous migration)
CREATE OR REPLACE FUNCTION public.batch_update_modules(updates jsonb)
RETURNS void AS $$
DECLARE
  mod_record jsonb;
BEGIN
  FOR mod_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Security check: Ensure user has access to the project associated with this module
    IF EXISTS (
      SELECT 1 FROM modules m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = (mod_record->>'id')::uuid 
        AND public.has_project_access(p.id)
    ) THEN
      UPDATE modules
      SET
        name = COALESCE((mod_record->>'name')::text, name),
        milestone_id = CASE
          WHEN mod_record ? 'milestone_id' THEN
            CASE
              WHEN (mod_record->>'milestone_id') IS NULL THEN NULL
              ELSE (mod_record->>'milestone_id')::uuid
            END
          ELSE milestone_id
        END,
        updated_at = now()
      WHERE id = (mod_record->>'id')::uuid;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Secure Batch Update Milestones
CREATE OR REPLACE FUNCTION public.batch_update_milestones(updates jsonb)
RETURNS void AS $$
DECLARE
  ms_record jsonb;
BEGIN
  FOR ms_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Security check: Ensure user has access to the project associated with this milestone
    IF EXISTS (
      SELECT 1 FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = (ms_record->>'id')::uuid 
        AND public.has_project_access(p.id)
    ) THEN
      UPDATE milestones
      SET
        name = COALESCE((ms_record->>'name')::text, name),
        due_date = CASE
          WHEN ms_record ? 'due_date' THEN
            CASE
              WHEN (ms_record->>'due_date') IS NULL THEN NULL
              ELSE (ms_record->>'due_date')::date
            END
          ELSE due_date
        END,
        updated_at = now()
      WHERE id = (ms_record->>'id')::uuid;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
