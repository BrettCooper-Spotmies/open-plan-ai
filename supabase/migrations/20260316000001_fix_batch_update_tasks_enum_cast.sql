-- Fix batch_update_tasks: status/priority are enum types, not text.
-- Using COALESCE(text_val, enum_col) causes a PostgreSQL type-resolution error (400).
-- Use CASE expressions to conditionally cast only when the key is present.

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
        status = CASE
          WHEN task_record ? 'status' AND task_record->>'status' IS NOT NULL
            THEN (task_record->>'status')::task_status
          ELSE status
        END,
        priority = CASE
          WHEN task_record ? 'priority' AND task_record->>'priority' IS NOT NULL
            THEN (task_record->>'priority')::priority
          ELSE priority
        END,
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.batch_update_tasks(jsonb) TO authenticated;
