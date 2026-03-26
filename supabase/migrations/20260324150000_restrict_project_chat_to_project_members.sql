-- Restrict project chat groups to project participants only.
-- After this, only project members (and the project creator as owner) can see/send in that group.

CREATE OR REPLACE FUNCTION public.sync_project_chat_group_members_internal(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_project_creator uuid;
BEGIN
  SELECT created_by
  INTO v_project_creator
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_conversation_id := public.ensure_project_chat_group_internal(p_project_id);

  -- Remove users who are no longer part of this project conversation.
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
          OR p.id = v_project_creator
        )
    );

  -- Add/update only eligible users for the project group.
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    u.user_id,
    CASE
      WHEN u.user_id = v_project_creator THEN 'owner'
      ELSE 'member'
    END
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

-- Backfill all existing projects immediately.
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
