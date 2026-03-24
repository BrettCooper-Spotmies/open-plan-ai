-- Prevent assignment-notification trigger from failing when NEW.user_id
-- does not have a corresponding profile row.

CREATE OR REPLACE FUNCTION public.handle_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_description TEXT;
  v_project_id UUID;
  v_actor_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'project_members' THEN
    SELECT name INTO v_title FROM public.projects WHERE id = NEW.project_id;
    v_description := 'You have been assigned to the project: ' || COALESCE(v_title, 'Unknown');
    v_project_id := NEW.project_id;
    v_actor_id := NEW.added_by;
  ELSIF TG_TABLE_NAME = 'task_assignees' THEN
    SELECT title, project_id INTO v_title, v_project_id FROM public.tasks WHERE id = NEW.task_id;
    v_description := 'You have been assigned to the task: ' || COALESCE(v_title, 'Unknown');
    v_actor_id := NEW.assigned_by;
  ELSIF TG_TABLE_NAME = 'issue_assignees' THEN
    SELECT title, project_id INTO v_title, v_project_id FROM public.issues WHERE id = NEW.issue_id;
    v_description := 'You have been assigned to the issue: ' || COALESCE(v_title, 'Unknown');
    v_actor_id := NEW.assigned_by;
  END IF;

  -- Guard against stale/deleted users to avoid FK failures on notifications.user_id.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = NEW.user_id
      AND p.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    description,
    project_id,
    actor_id
  ) VALUES (
    NEW.user_id,
    'assignment'::notification_type,
    'New Assignment',
    v_description,
    v_project_id,
    COALESCE(v_actor_id, auth.uid(), NEW.user_id)
  );

  RETURN NEW;
END;
$$;
