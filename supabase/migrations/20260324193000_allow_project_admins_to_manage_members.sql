-- Allow project Admin members to manage project members
-- with the same capabilities as the project creator.

CREATE OR REPLACE FUNCTION public.can_manage_project_members(p_project_id uuid)
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
      AND (
        p.created_by = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.project_members pm
          WHERE pm.project_id = p_project_id
            AND pm.user_id = auth.uid()
            AND lower(coalesce(pm.role, '')) = 'admin'
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Project creator can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Project creator can update members" ON public.project_members;
DROP POLICY IF EXISTS "Project creator can delete members" ON public.project_members;

CREATE POLICY "Project managers can insert members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_project_members(project_id));

CREATE POLICY "Project managers can update members"
  ON public.project_members FOR UPDATE
  TO authenticated
  USING (public.can_manage_project_members(project_id))
  WITH CHECK (public.can_manage_project_members(project_id));

CREATE POLICY "Project managers can delete members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (public.can_manage_project_members(project_id));

REVOKE ALL ON FUNCTION public.can_manage_project_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_project_members(uuid) TO authenticated;

