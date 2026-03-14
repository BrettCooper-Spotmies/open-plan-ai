-- Harden soft delete and batch update RPCs
-- - Generic access-denied errors to avoid resource enumeration
-- - Defensive JSON validation for batch payloads
-- - Safe UUID parsing per record to avoid whole-batch failures

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
    AND p.deleted_at IS NULL
    AND public.has_project_access(p.id);

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;

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
    AND t.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = t.project_id
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;

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
    AND m.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = m.project_id
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;

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
    AND m.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = m.project_id
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;

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
    AND i.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = i.project_id
        AND public.has_project_access(p.id)
    );

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.batch_update_tasks(updates jsonb)
RETURNS void AS $$
DECLARE
  task_record jsonb;
  task_id_value uuid;
BEGIN
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid updates payload';
  END IF;

  FOR task_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF NOT (task_record ? 'id') OR task_record->>'id' IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      task_id_value := (task_record->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;

    IF EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = task_id_value
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
      WHERE id = task_id_value;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.batch_update_modules(updates jsonb)
RETURNS void AS $$
DECLARE
  mod_record jsonb;
  module_id_value uuid;
BEGIN
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid updates payload';
  END IF;

  FOR mod_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF NOT (mod_record ? 'id') OR mod_record->>'id' IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      module_id_value := (mod_record->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;

    IF EXISTS (
      SELECT 1 FROM modules m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = module_id_value
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
      WHERE id = module_id_value;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.batch_update_milestones(updates jsonb)
RETURNS void AS $$
DECLARE
  ms_record jsonb;
  milestone_id_value uuid;
BEGIN
  IF updates IS NULL OR jsonb_typeof(updates) <> 'array' THEN
    RAISE EXCEPTION 'Invalid updates payload';
  END IF;

  FOR ms_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    IF NOT (ms_record ? 'id') OR ms_record->>'id' IS NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      milestone_id_value := (ms_record->>'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      CONTINUE;
    END;

    IF EXISTS (
      SELECT 1 FROM milestones m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = milestone_id_value
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
      WHERE id = milestone_id_value;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
