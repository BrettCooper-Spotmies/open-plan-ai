-- Remove stale conversation members with missing/deleted profiles
-- and ensure project chat sync only includes valid profiles.

DO $$
DECLARE
  v_deleted_rows int := 0;
BEGIN
  DELETE FROM public.conversation_members cm
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = cm.user_id
      AND p.deleted_at IS NULL
  );

  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  RAISE NOTICE '[cleanup_invalid_conversation_members] deleted % stale conversation_members', v_deleted_rows;
END;
$$;

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
  v_deleted_rows int := 0;
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
      SELECT p.id
      FROM public.profiles p
      WHERE p.deleted_at IS NULL
        AND (
          p.id IN (
            SELECT pm.user_id
            FROM public.project_members pm
            WHERE pm.project_id = p_project_id
          )
          OR p.id IN (
            SELECT om.user_id
            FROM public.organization_members om
            WHERE om.organization_id = v_organization_id
          )
          OR p.id = v_project_creator
        )
    );

  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  RAISE NOTICE '[sync_project_chat_group_members_internal] project_id=% conversation_id=% deleted % eligible-mismatch conversation_members', p_project_id, v_conversation_id, v_deleted_rows;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    u.user_id,
    CASE WHEN u.user_id = v_project_creator THEN 'owner' ELSE 'member' END
  FROM (
    SELECT p.id AS user_id
    FROM public.profiles p
    WHERE p.deleted_at IS NULL
      AND (
        p.id IN (
          SELECT pm.user_id
          FROM public.project_members pm
          WHERE pm.project_id = p_project_id
        )
        OR p.id IN (
          SELECT om.user_id
          FROM public.organization_members om
          WHERE om.organization_id = v_organization_id
        )
        OR p.id = v_project_creator
      )
  ) AS u
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = CASE
    WHEN EXCLUDED.user_id = v_project_creator THEN 'owner'
    ELSE 'member'
  END;
END;
$$;

DO $$
DECLARE
  v_project_id uuid;
BEGIN
  FOR v_project_id IN
    SELECT p.id
    FROM public.projects p
    WHERE p.deleted_at IS NULL
  LOOP
    PERFORM public.sync_project_chat_group_members_internal(v_project_id);
  END LOOP;
END;
$$;
