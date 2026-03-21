-- 1. Create auth_error_logs table if not exists for debugging handle_new_user profile synchronization
CREATE TABLE IF NOT EXISTS public.auth_error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Protect logs but allow service role
ALTER TABLE public.auth_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admin read only" ON public.auth_error_logs;
CREATE POLICY "Super admin read only" ON public.auth_error_logs FOR SELECT USING (auth.jwt()->>'role' = 'service_role');

-- 2. Update handle_new_user to capture errors explicitly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	BEGIN
		INSERT INTO public.profiles (id, email, name, initials)
		VALUES (
			NEW.id,
			COALESCE(NEW.email, ''),
			COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'User'),
			UPPER(LEFT(COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'US'), 2))
		)
		ON CONFLICT (id) DO UPDATE
		SET
			email = EXCLUDED.email,
			name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
			initials = COALESCE(NULLIF(EXCLUDED.initials, ''), public.profiles.initials);
	EXCEPTION
		WHEN OTHERS THEN
			-- Log to auth_error_logs, but never fail auth signups
			INSERT INTO public.auth_error_logs (user_id, error_message)
			VALUES (NEW.id, SQLERRM);
			RAISE WARNING 'handle_new_user profile sync failed for user %: %', NEW.id, SQLERRM;
	END;

	RETURN NEW;
END;
$$;

-- 3. Update activity triggers to validate session context (auth.uid())
CREATE OR REPLACE FUNCTION public.log_project_created_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
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
	SELECT
		NEW.id,
		v_user_id,
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

CREATE OR REPLACE FUNCTION public.log_task_created_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
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
	SELECT
		NEW.project_id,
		v_user_id,
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

CREATE OR REPLACE FUNCTION public.log_task_status_changed_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
		RETURN NEW;
	END IF;

    IF OLD.status IS NULL AND NEW.status IS NULL THEN
        RAISE NOTICE 'Skipping status change activity log due to null statuses on Task %', NEW.id;
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
	) VALUES (
		NEW.project_id,
		v_user_id,
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

CREATE OR REPLACE FUNCTION public.log_task_assigned_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_project_id UUID;
	v_task_title TEXT;
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
		RETURN NEW;
	END IF;

	SELECT t.project_id, t.title
		INTO v_project_id, v_task_title
	FROM public.tasks t
	WHERE t.id = NEW.task_id;

	IF v_project_id IS NULL THEN
		RAISE NOTICE 'Task % project ID not found', NEW.task_id;
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
		v_user_id,
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

CREATE OR REPLACE FUNCTION public.log_project_stage_changed_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
		RETURN NEW;
	END IF;

    IF OLD.stage IS NULL AND NEW.stage IS NULL THEN
        RAISE NOTICE 'Skipping stage change logging due to null stages for %', NEW.id;
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
	) VALUES (
		NEW.id,
		v_user_id,
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

CREATE OR REPLACE FUNCTION public.log_project_member_assigned_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_project_name TEXT;
	v_assignee_name TEXT;
	v_user_id UUID := auth.uid();
BEGIN
	IF v_user_id IS NULL THEN
		RAISE WARNING 'Session context unavailable. Cannot log activity.';
		RETURN NEW;
	END IF;

	SELECT p.name INTO v_project_name
	FROM public.projects p
	WHERE p.id = NEW.project_id;

	SELECT pr.name INTO v_assignee_name
	FROM public.profiles pr
	WHERE pr.id = NEW.user_id;

    IF v_project_name IS NULL OR v_assignee_name IS NULL THEN
        RAISE NOTICE 'Missing project or profile info. Skipping member activity attribution.';
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
	) VALUES (
		NEW.project_id,
		v_user_id,
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

-- 4. Harden High-Severity RPCs by revoking public access explicitly
REVOKE ALL ON FUNCTION public.get_recent_org_activities(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_org_activities(uuid, int) TO authenticated;

REVOKE ALL ON FUNCTION public.has_project_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_project_access(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.handle_activity_broadcast_notification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_activity_broadcast_notification() TO authenticated;

-- 5. Optimize handle_activity_broadcast_notification
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
	SELECT 
		om.user_id,
		NEW.user_id,
		'activity'::public.notification_type,
		'New Activity',
		NEW.description,
		NEW.project_id
	FROM public.organization_members om
	WHERE om.organization_id = v_org_id
	  AND om.user_id != NEW.user_id
	  AND NOT EXISTS (
		SELECT 1
		FROM public.notifications n
		WHERE n.user_id = om.user_id
			AND n.project_id = NEW.project_id
			AND n.description = NEW.description
			AND n.created_at > (NOW() - INTERVAL '30 seconds')
	)
	LIMIT 1500; -- Increase cap safely over 500 without impacting DB limits severely

	RETURN NEW;
END;
$$;

-- 6. Add performance indexes for NOT EXISTS clauses
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON public.activities (project_id, entity_type, entity_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_project_desc ON public.notifications (user_id, project_id, description, created_at);
