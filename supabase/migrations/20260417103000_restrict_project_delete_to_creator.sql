-- Restrict project deletion to the project creator only.
-- Team members and admins can still access/update projects per existing policies,
-- but only the user who created the project may delete (hard or soft).

DROP POLICY IF EXISTS "Project access for deletes" ON public.projects;

CREATE POLICY "Only project creator can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

CREATE OR REPLACE FUNCTION public.soft_delete_project(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE public.projects p
  SET deleted_at = NOW()
  WHERE p.id = project_id
    AND p.deleted_at IS NULL
    AND p.created_by = auth.uid();

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;
END;
$$;
