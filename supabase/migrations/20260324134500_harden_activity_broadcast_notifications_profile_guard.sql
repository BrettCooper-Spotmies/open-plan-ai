-- Prevent activity broadcast notifications from failing when stale organization_members
-- or project_members rows reference user ids that no longer exist in profiles.

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

  SELECT p.organization_id
  INTO v_org_id
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
  JOIN public.profiles p
    ON p.id = u.user_id
   AND p.deleted_at IS NULL
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
