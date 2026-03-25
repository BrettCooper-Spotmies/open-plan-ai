-- Harden: ensure_project_creator_membership trigger
-- Prevent `created_by` tampering on projects inserts when the caller is a normal user.
-- Without this, `projects` INSERT RLS only checks org membership, not that
-- `NEW.created_by = auth.uid()`. Since the trigger grants Admin role based on
-- NEW.created_by, mismatches could cause integrity/security issues.

CREATE OR REPLACE FUNCTION public.ensure_project_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_role text := coalesce(auth.jwt()->>'role', '');
BEGIN
  -- Allow trusted service-role inserts without enforcing created_by.
  -- For normal authenticated callers, require created_by to match auth.uid().
  IF v_caller_uid IS NOT NULL
     AND v_caller_role <> 'service_role'
     AND NEW.created_by IS DISTINCT FROM v_caller_uid THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure creator has a non-deleted profile.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = NEW.created_by
      AND pr.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.created_by, 'Admin', NEW.created_by)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = 'Admin';

  RETURN NEW;
END;
$$;

