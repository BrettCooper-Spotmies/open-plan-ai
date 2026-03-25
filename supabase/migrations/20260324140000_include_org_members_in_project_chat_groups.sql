-- Ensure project chat groups are visible to organization members.
-- This includes org members in conversation_members so group chats always show up.

CREATE OR REPLACE FUNCTION public.sync_project_chat_group_members_internal(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_project_creator uuid;
  v_organization_id uuid;
BEGIN
  SELECT created_by, organization_id
  INTO v_project_creator, v_organization_id
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_conversation_id := public.ensure_project_chat_group_internal(p_project_id);

  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_conversation_id
    AND cm.user_id NOT IN (
      SELECT pm.user_id
      FROM public.project_members pm
      WHERE pm.project_id = p_project_id
      UNION
      SELECT om.user_id
      FROM public.organization_members om
      WHERE om.organization_id = v_organization_id
      UNION
      SELECT v_project_creator
      WHERE v_project_creator IS NOT NULL
    );

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    u.user_id,
    CASE
      WHEN u.user_id = v_project_creator THEN 'owner'
      ELSE 'member'
    END
  FROM (
    SELECT pm.user_id
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
    UNION
    SELECT om.user_id
    FROM public.organization_members om
    WHERE om.organization_id = v_organization_id
    UNION
    SELECT v_project_creator
    WHERE v_project_creator IS NOT NULL
  ) AS u
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = CASE
    WHEN EXCLUDED.user_id = v_project_creator THEN 'owner'
    ELSE 'member'
  END;
END;
$$;
