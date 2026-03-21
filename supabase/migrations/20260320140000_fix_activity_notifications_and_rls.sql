-- 1. Add 'activity' to notification_type enum
-- Safe to do this outside transaction block in Supabase or inside if PG12+.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'activity';

-- 2. Update has_project_access
CREATE OR REPLACE FUNCTION public.has_project_access(_proj_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.projects p
    WHERE p.id = _proj_id
      AND p.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 
          FROM public.organization_members om 
          WHERE om.organization_id = p.organization_id
            AND om.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 
          FROM public.project_members pm 
          WHERE pm.project_id = _proj_id
            AND pm.user_id = auth.uid()
        )
      )
  )
$$;

-- 3. Update projects SELECT policy to also allow project_members
DROP POLICY IF EXISTS "Users can view projects in their orgs" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects in their orgs or projects they are members of" ON public.projects;

CREATE POLICY "Users can view projects in their orgs or projects they are members of"
  ON public.projects FOR SELECT
  TO authenticated
  USING (
    (public.has_org_access(organization_id) OR public.has_project_access(id)) 
    AND deleted_at IS NULL
  );

-- 4. Create trigger to send notifications for activities
CREATE OR REPLACE FUNCTION public.handle_activity_broadcast_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_description TEXT;
  v_org_id UUID;
  v_actor_id UUID;
  v_project_name TEXT;
BEGIN
  -- We don't want to spam notifications for simple project/task assignments 
  -- since handle_assignment_notification already alerts the specific assignee natively.
  -- But an 'assigned task' activity might be interesting for the rest of the team.
  -- Let's just broadcast everything as per user request to ensure everyone sees it.

  v_actor_id := NEW.user_id;

  IF NEW.project_id IS NOT NULL THEN
    SELECT organization_id, name INTO v_org_id, v_project_name FROM public.projects WHERE id = NEW.project_id;
    
    IF v_org_id IS NOT NULL THEN
      -- Insert a notification for every member of the org OR project who is NOT the actor
      INSERT INTO public.notifications (
        user_id,
        actor_id,
        type,
        title,
        description,
        project_id
      )
      SELECT DISTINCT u.user_id, v_actor_id, 'activity'::notification_type, 'New Activity', NEW.description, NEW.project_id
      FROM (
        SELECT user_id FROM public.organization_members WHERE organization_id = v_org_id
        UNION
        SELECT user_id FROM public.project_members WHERE project_id = NEW.project_id
      ) u
      WHERE u.user_id != v_actor_id
      AND NOT EXISTS (
        -- Prevent spamming exact duplicate notifications within 1 minute
        SELECT 1 FROM public.notifications n 
        WHERE n.user_id = u.user_id 
          AND n.project_id = NEW.project_id 
          AND n.description = NEW.description 
          AND n.created_at > (NOW() - INTERVAL '1 minute')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger only after new activities
DROP TRIGGER IF EXISTS on_activity_broadcast ON public.activities;
CREATE TRIGGER on_activity_broadcast
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_activity_broadcast_notification();
