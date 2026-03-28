-- Prevent activity broadcast notifications from failing when stale organization_members
-- or project_members rows reference user ids that no longer exist in profiles.

-- Race-safe notification suppression within a rolling 30s window:
-- We dedupe using a generated 30-second bucket and a unique index, then rely on
-- INSERT .. ON CONFLICT DO NOTHING instead of NOT EXISTS (which is vulnerable
-- to concurrent inserts).
-- NOTE: We intentionally do NOT use a GENERATED column here because Postgres
-- requires the generation expression to be IMMUTABLE; timestamptz epoch math
-- can fail that requirement depending on settings/version.
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS created_at_30s_bucket bigint;

-- Backfill existing rows (idempotent).
UPDATE public.notifications
SET created_at_30s_bucket = floor(extract(epoch from created_at) / 30)::bigint
WHERE created_at_30s_bucket IS NULL;

CREATE OR REPLACE FUNCTION public.set_notifications_created_at_30s_bucket()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at_30s_bucket := floor(extract(epoch from NEW.created_at) / 30)::bigint;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_created_at_30s_bucket ON public.notifications;
CREATE TRIGGER trg_notifications_created_at_30s_bucket
BEFORE INSERT OR UPDATE OF created_at
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_notifications_created_at_30s_bucket();

-- If earlier NOT EXISTS logic created duplicates under concurrency, remove
-- extra rows so the new unique index can be created successfully.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, project_id, type, description, created_at_30s_bucket
      ORDER BY created_at DESC, id ASC
    ) AS rn
  FROM public.notifications
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_user_project_type_desc_30s_uniq
ON public.notifications (user_id, project_id, type, description, created_at_30s_bucket);

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
  ON CONFLICT (user_id, project_id, type, description, created_at_30s_bucket) DO NOTHING;

  RETURN NEW;
END;
$$;
