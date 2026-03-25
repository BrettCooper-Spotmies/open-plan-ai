-- Ensure project creator is always a project member (Admin),
-- and only the project creator can manage project_members rows.

CREATE OR REPLACE FUNCTION public.is_project_creator(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.deleted_at IS NULL
      AND p.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  VALUES (NEW.id, NEW.created_by, 'Admin', NEW.created_by)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = 'Admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_creator_membership ON public.projects;
CREATE TRIGGER trg_project_creator_membership
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.ensure_project_creator_membership();

-- Backfill existing projects so creators are always visible in project team.
INSERT INTO public.project_members (project_id, user_id, role, added_by)
SELECT
  p.id,
  p.created_by,
  'Admin'::text,
  p.created_by
FROM public.projects p
JOIN public.profiles pr
  ON pr.id = p.created_by
 AND pr.deleted_at IS NULL
WHERE p.deleted_at IS NULL
  AND p.created_by IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET role = 'Admin';

DROP POLICY IF EXISTS "Project admins can manage members" ON public.project_members;
DROP POLICY IF EXISTS "Project creator can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project creator can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project creator can delete members" ON public.project_members;

CREATE POLICY "Project creator can insert members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_project_creator(project_id));

CREATE POLICY "Project creator can update members"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (public.is_project_creator(project_id))
  WITH CHECK (public.is_project_creator(project_id));

CREATE POLICY "Project creator can delete members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (public.is_project_creator(project_id));

REVOKE ALL ON FUNCTION public.is_project_creator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_creator(uuid) TO authenticated;

