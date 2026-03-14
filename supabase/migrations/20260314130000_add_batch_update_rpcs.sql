-- Add batch update RPCs to avoid N+1 queries
CREATE OR REPLACE FUNCTION batch_update_tasks(updates jsonb)
RETURNS void AS $$
DECLARE
  task_record jsonb;
BEGIN
  FOR task_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Security check: Ensure user has access to the project associated with this task
    IF NOT EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = (task_record->>'id')::uuid AND public.has_project_access(p.id)
    ) THEN
      CONTINUE; 
    END IF;

    UPDATE tasks
    SET
      status = COALESCE((task_record->>'status')::text, status),
      priority = COALESCE((task_record->>'priority')::text, priority),
      milestone_id = CASE
        WHEN task_record ? 'milestoneId' THEN (task_record->>'milestoneId')::uuid
        ELSE milestone_id
      END,
      updated_at = now()
    WHERE id = (task_record->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION batch_update_modules(updates jsonb)
RETURNS void AS $$
DECLARE
  mod_record jsonb;
BEGIN
  FOR mod_record IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    -- Security check: Ensure user has access to the project associated with this module
    IF NOT EXISTS (
      SELECT 1 FROM modules m
      JOIN projects p ON m.project_id = p.id
      WHERE m.id = (mod_record->>'id')::uuid AND public.has_project_access(p.id)
    ) THEN
      CONTINUE;
    END IF;

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
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
