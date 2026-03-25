-- Enforce on-demand project chat creation:
-- 1) Never auto-create chat groups from sync paths/triggers.
-- 2) Only project team members (or project creator) can start project chat.

CREATE OR REPLACE FUNCTION public.can_start_project_chat(p_project_id uuid)
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
        )
      )
  );
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
  v_deleted_rows int := 0;
  v_inserted_rows int := 0;
BEGIN
  SELECT created_by
  INTO v_project_creator
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE NOTICE '[sync_project_chat_group_members_internal] project not found or soft-deleted. project_id=%', p_project_id;
    RETURN;
  END IF;

  -- Strict on-demand behavior:
  -- if chat group does not exist yet, do not create one from sync paths.
  SELECT pcg.conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups pcg
  WHERE pcg.project_id = p_project_id;

  IF v_conversation_id IS NULL THEN
    RAISE NOTICE '[sync_project_chat_group_members_internal] project has no chat mapping yet. project_id=%', p_project_id;
    RETURN;
  END IF;

  -- Mark active members (project members + creator) as active in access history.
  INSERT INTO public.project_chat_member_access (project_id, user_id, joined_at, left_at)
  SELECT
    p_project_id,
    u.user_id,
    now(),
    NULL
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
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET
    left_at = NULL,
    updated_at = now();

  -- Mark users removed from project scope.
  UPDATE public.project_chat_member_access pca
  SET
    left_at = COALESCE(pca.left_at, now()),
    updated_at = now()
  WHERE pca.project_id = p_project_id
    AND pca.user_id NOT IN (
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

  -- Remove stale users with no profile row from chat membership.
  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_conversation_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = cm.user_id
        AND p.deleted_at IS NULL
    );

  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  RAISE NOTICE '[sync_project_chat_group_members_internal] project_id=% conversation_id=% stale-members-removed=%', p_project_id, v_conversation_id, v_deleted_rows;

  -- Ensure conversation includes everyone who has ever had access history for this project.
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    pca.user_id,
    CASE
      WHEN pca.user_id = v_project_creator THEN 'owner'
      ELSE 'member'
    END
  FROM public.project_chat_member_access pca
  WHERE pca.project_id = p_project_id
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = CASE
    WHEN EXCLUDED.user_id = v_project_creator THEN 'owner'
    ELSE 'member'
  END;

  GET DIAGNOSTICS v_inserted_rows = ROW_COUNT;
  RAISE NOTICE '[sync_project_chat_group_members_internal] project_id=% conversation_id=% conversation-members-upserted=%', p_project_id, v_conversation_id, v_inserted_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_chat_group(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  IF NOT public.can_start_project_chat(p_project_id) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Explicit create path (called from UI "Start Chat").
  v_conversation_id := public.ensure_project_chat_group_internal(p_project_id);
  PERFORM public.sync_project_chat_group_members_internal(p_project_id);

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.can_start_project_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_start_project_chat(uuid) TO authenticated;

