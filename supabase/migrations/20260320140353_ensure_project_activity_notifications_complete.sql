-- Ensure project/task events always create activity + notifications for all org participants.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'activity';

CREATE OR REPLACE FUNCTION public.log_project_stage_changed_activity()
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
		NEW.id,
		COALESCE(NEW.created_by, auth.uid()),
		'project_updated'::public.activity_type,
		'project',
		NEW.id,
		'changed project "' || NEW.name || '" stage from ' || COALESCE(OLD.stage::text, 'unknown') || ' to ' || COALESCE(NEW.stage::text, 'unknown'),
		jsonb_build_object('from', OLD.stage, 'to', NEW.stage),
		NOW()
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_activity_stage_changed ON public.projects;
CREATE TRIGGER trg_projects_activity_stage_changed
AFTER UPDATE OF stage ON public.projects
FOR EACH ROW
WHEN (
	OLD.stage IS DISTINCT FROM NEW.stage
	AND NEW.deleted_at IS NULL
)
EXECUTE FUNCTION public.log_project_stage_changed_activity();

CREATE OR REPLACE FUNCTION public.log_project_member_assigned_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_project_name TEXT;
	v_assignee_name TEXT;
BEGIN
	SELECT p.name INTO v_project_name
	FROM public.projects p
	WHERE p.id = NEW.project_id;

	SELECT pr.name INTO v_assignee_name
	FROM public.profiles pr
	WHERE pr.id = NEW.user_id;

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
		COALESCE(NEW.added_by, auth.uid()),
		'project_assigned'::public.activity_type,
		'user',
		NEW.user_id,
		'assigned ' || COALESCE(v_assignee_name, 'a member') || ' to project "' || COALESCE(v_project_name, 'Project') || '"',
		jsonb_build_object('assigned_user_id', NEW.user_id),
		NOW()
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_members_activity_assigned ON public.project_members;
CREATE TRIGGER trg_project_members_activity_assigned
AFTER INSERT ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.log_project_member_assigned_activity();

CREATE OR REPLACE FUNCTION public.handle_activity_broadcast_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_org_id UUID;
BEGIN
	IF NEW.project_id IS NULL THEN
		RETURN NEW;
	END IF;

	SELECT p.organization_id INTO v_org_id
	FROM public.projects p
	WHERE p.id = NEW.project_id;

	IF v_org_id IS NULL THEN
		RETURN NEW;
	END IF;

	INSERT INTO public.notifications (
		user_id,
		actor_id,
		type,
		title,
		description,
		project_id
	)
	SELECT DISTINCT
		u.user_id,
		NEW.user_id,
		'activity'::public.notification_type,
		'New Activity',
		NEW.description,
		NEW.project_id
	FROM (
		SELECT om.user_id
		FROM public.organization_members om
		WHERE om.organization_id = v_org_id

		UNION

		SELECT pm.user_id
		FROM public.project_members pm
		WHERE pm.project_id = NEW.project_id
	) u
	WHERE NOT EXISTS (
		SELECT 1
		FROM public.notifications n
		WHERE n.user_id = u.user_id
			AND n.project_id = NEW.project_id
			AND n.description = NEW.description
			AND n.created_at > (NOW() - INTERVAL '30 seconds')
	);

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_activity_broadcast ON public.activities;
CREATE TRIGGER on_activity_broadcast
AFTER INSERT ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.handle_activity_broadcast_notification();

