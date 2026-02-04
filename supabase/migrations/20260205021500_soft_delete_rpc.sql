-- Secure Soft Delete Function
-- This isolates the logic and bypasses the problematic RLS Check behavior for updates
-- by handling the permission check manually and then performing the update with raised privileges.

CREATE OR REPLACE FUNCTION public.soft_delete_project(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass the specific RLS Blocking
SET search_path = public
AS $$
BEGIN
  -- 1. Check if the user has permission to view/edit the project
  -- We reuse the existing RLS helper function
  IF NOT EXISTS (
    SELECT 1 FROM projects 
    WHERE id = project_id 
    AND public.has_project_access(id)
  ) THEN
    RAISE EXCEPTION 'Access Denied or Project not found';
  END IF;

  -- 2. Perform the soft delete
  UPDATE projects 
  SET deleted_at = NOW()
  WHERE id = project_id;
  
END;
$$;
