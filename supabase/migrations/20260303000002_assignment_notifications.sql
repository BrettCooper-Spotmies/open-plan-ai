-- Function to handle assignment notifications for projects, tasks, and issues
CREATE OR REPLACE FUNCTION public.handle_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_description TEXT;
  v_project_id UUID;
  v_actor_id UUID;
BEGIN
  -- Determine title, description, and project_id based on the table
  IF TG_TABLE_NAME = 'project_members' THEN
    SELECT name INTO v_title FROM public.projects WHERE id = NEW.project_id;
    v_description := 'You have been assigned to the project: ' || v_title;
    v_project_id := NEW.project_id;
    v_actor_id := NEW.added_by;
    
  ELSIF TG_TABLE_NAME = 'task_assignees' THEN
    SELECT title, project_id INTO v_title, v_project_id FROM public.tasks WHERE id = NEW.task_id;
    v_description := 'You have been assigned to the task: ' || v_title;
    v_actor_id := NEW.assigned_by;
    
  ELSIF TG_TABLE_NAME = 'issue_assignees' THEN
    SELECT title, project_id INTO v_title, v_project_id FROM public.issues WHERE id = NEW.issue_id;
    v_description := 'You have been assigned to the issue: ' || v_title;
    v_actor_id := NEW.assigned_by;
  END IF;

  -- Insert the notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    description,
    project_id,
    actor_id
  ) VALUES (
    NEW.user_id,
    'assignment',
    'New Assignment',
    v_description,
    v_project_id,
    COALESCE(v_actor_id, auth.uid())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically create notifications on insert
DROP TRIGGER IF EXISTS on_project_assignment ON public.project_members;
CREATE TRIGGER on_project_assignment
  AFTER INSERT ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_assignment_notification();

DROP TRIGGER IF EXISTS on_task_assignment ON public.task_assignees;
CREATE TRIGGER on_task_assignment
  AFTER INSERT ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.handle_assignment_notification();

DROP TRIGGER IF EXISTS on_issue_assignment ON public.issue_assignees;
CREATE TRIGGER on_issue_assignment
  AFTER INSERT ON public.issue_assignees
  FOR EACH ROW EXECUTE FUNCTION public.handle_assignment_notification();
