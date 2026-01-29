-- Fix 1: Attachments - Replace overly permissive SELECT policy with project-scoped access
-- First add project_id column to attachments for proper RLS (needed for access checks)
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS project_id UUID;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attachments_project_id ON public.attachments(project_id);

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view attachments" ON public.attachments;

-- Create proper access-controlled SELECT policy
CREATE POLICY "Users can view attachments in accessible projects"
  ON public.attachments
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user uploaded the attachment
    uploaded_by = auth.uid() OR
    -- Or if attachment has project_id and user has project access
    (project_id IS NOT NULL AND has_project_access(project_id)) OR
    -- Or if attachment is linked to a task the user can access
    (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = attachments.entity_id 
      AND has_project_access(t.project_id)
    )) OR
    -- Or if attachment is linked to an issue the user can access
    (entity_type = 'issue' AND EXISTS (
      SELECT 1 FROM public.issues i 
      WHERE i.id = attachments.entity_id 
      AND has_project_access(i.project_id)
    ))
  );

-- Fix 2: Comments - Replace permissive SELECT policy with entity-scoped access
DROP POLICY IF EXISTS "Users can view comments on accessible entities" ON public.comments;

CREATE POLICY "Users can view comments on accessible entities"
  ON public.comments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      -- User authored the comment
      author_id = auth.uid() OR
      -- Comment is on a task user can access
      (entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t 
        WHERE t.id = comments.entity_id 
        AND has_project_access(t.project_id)
        AND t.deleted_at IS NULL
      )) OR
      -- Comment is on an issue user can access
      (entity_type = 'issue' AND EXISTS (
        SELECT 1 FROM public.issues i 
        WHERE i.id = comments.entity_id 
        AND has_project_access(i.project_id)
        AND i.deleted_at IS NULL
      )) OR
      -- Comment is on a milestone user can access
      (entity_type = 'milestone' AND EXISTS (
        SELECT 1 FROM public.milestones m 
        WHERE m.id = comments.entity_id 
        AND has_project_access(m.project_id)
        AND m.deleted_at IS NULL
      )) OR
      -- Comment is on a module user can access
      (entity_type = 'module' AND EXISTS (
        SELECT 1 FROM public.modules mod 
        WHERE mod.id = comments.entity_id 
        AND has_project_access(mod.project_id)
        AND mod.deleted_at IS NULL
      ))
    )
  );

-- Fix 3: Email verifications - The policy is already service_role only but let's make it explicit
-- Drop and recreate to ensure it's properly restricted
DROP POLICY IF EXISTS "Only service role can manage verifications" ON public.email_verifications;

-- Revoke all access from authenticated users
REVOKE ALL ON public.email_verifications FROM authenticated;
REVOKE ALL ON public.email_verifications FROM anon;

-- Service role retains full access by default (no policy needed for service role)
-- But we need to ensure RLS doesn't block service role
-- The table already has RLS enabled, service role bypasses it by default