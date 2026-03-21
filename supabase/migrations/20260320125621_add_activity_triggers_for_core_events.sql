-- Log core events to activities at DB-level to keep dashboard feed consistent
-- across all client code paths.

CREATE OR REPLACE FUNCTION public.log_project_created_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO public.activities (
		project_id,
		user_id,
		activity_type,
		entity_type,
		entity_id,
		description,
		metadata,
		created_at
	)
	SELECT
		NEW.id,
		COALESCE(NEW.created_by, auth.uid()),
		'project_created'::public.activity_type,
		'project',
		NEW.id,
		'created project "' || NEW.name || '"',
		'{}'::jsonb,
		COALESCE(NEW.created_at, NOW())
	WHERE NOT EXISTS (
		SELECT 1
		FROM public.activities a
		WHERE a.project_id = NEW.id
			AND a.entity_type = 'project'
			AND a.entity_id = NEW.id
			AND a.activity_type = 'project_created'::public.activity_type
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_activity_created ON public.projects;
CREATE TRIGGER trg_projects_activity_created
AFTER INSERT ON public.projects
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.log_project_created_activity();

CREATE OR REPLACE FUNCTION public.log_task_created_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO public.activities (
		project_id,
		user_id,
		activity_type,
		entity_type,
		entity_id,
		description,
		metadata,
		created_at
	)
	SELECT
		NEW.project_id,
		COALESCE(NEW.created_by, auth.uid()),
		'task_created'::public.activity_type,
		'task',
		NEW.id,
		'created task "' || NEW.title || '"',
		'{}'::jsonb,
		COALESCE(NEW.created_at, NOW())
	WHERE NOT EXISTS (
		SELECT 1
		FROM public.activities a
		WHERE a.entity_type = 'task'
			AND a.entity_id = NEW.id
			AND a.activity_type = 'task_created'::public.activity_type
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_activity_created ON public.tasks;
CREATE TRIGGER trg_tasks_activity_created
AFTER INSERT ON public.tasks
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.log_task_created_activity();

CREATE OR REPLACE FUNCTION public.log_task_status_changed_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	INSERT INTO public.activities (
		project_id,
		user_id,
		activity_type,
		entity_type,
		entity_id,
		description,
		metadata,
		created_at
	) VALUES (
		NEW.project_id,
		auth.uid(),
		'status_changed'::public.activity_type,
		'task',
		NEW.id,
		'changed task "' || NEW.title || '" status from ' || COALESCE(OLD.status::text, 'unknown') || ' to ' || COALESCE(NEW.status::text, 'unknown'),
		jsonb_build_object('from', OLD.status, 'to', NEW.status),
		NOW()
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_activity_status_changed ON public.tasks;
CREATE TRIGGER trg_tasks_activity_status_changed
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
WHEN (
	OLD.status IS DISTINCT FROM NEW.status
	AND NEW.deleted_at IS NULL
)
EXECUTE FUNCTION public.log_task_status_changed_activity();

CREATE OR REPLACE FUNCTION public.log_task_assigned_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_project_id UUID;
	v_task_title TEXT;
BEGIN
	SELECT t.project_id, t.title
		INTO v_project_id, v_task_title
	FROM public.tasks t
	WHERE t.id = NEW.task_id;

	IF v_project_id IS NULL THEN
		RETURN NEW;
	END IF;

	INSERT INTO public.activities (
		project_id,
		user_id,
		activity_type,
		entity_type,
		entity_id,
		description,
		metadata,
		created_at
	)
	VALUES (
		v_project_id,
		COALESCE(NEW.assigned_by, auth.uid()),
		'task_updated'::public.activity_type,
		'task',
		NEW.task_id,
		'assigned task "' || COALESCE(v_task_title, 'Task') || '"',
		jsonb_build_object('assigned_user_id', NEW.user_id),
		NOW()
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_assignees_activity_assigned ON public.task_assignees;
CREATE TRIGGER trg_task_assignees_activity_assigned
AFTER INSERT ON public.task_assignees
FOR EACH ROW
EXECUTE FUNCTION public.log_task_assigned_activity();

