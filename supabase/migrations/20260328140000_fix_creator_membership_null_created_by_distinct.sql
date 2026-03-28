-- NULL created_by + authenticated JWT incorrectly raised Access Denied:
-- PostgreSQL evaluates (NULL IS DISTINCT FROM auth.uid()) as TRUE, so the
-- tamper check in ensure_project_creator_membership ran before the early
-- return for NULL created_by. Only enforce equality when created_by is set.

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
  IF v_caller_uid IS NOT NULL
     AND v_caller_role <> 'service_role'
     AND NEW.created_by IS NOT NULL
     AND NEW.created_by IS DISTINCT FROM v_caller_uid THEN
    RAISE NOTICE '[ensure_project_creator_membership] Access Denied: created_by mismatch (caller_last=% new_created_by_last=%)',
      right(v_caller_uid::text, 8), right(NEW.created_by::text, 8);
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = NEW.created_by
      AND pr.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.created_by, 'admin'::public.project_role, NEW.created_by)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = 'admin'::public.project_role;

  RETURN NEW;
END;
$$;
