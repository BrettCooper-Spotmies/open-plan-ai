-- Make project chat groups start on-demand and preserve edited metadata.
-- 1) Do not auto-create group chats from sync paths/triggers.
-- 2) Keep edited name/avatar/description intact once a group exists.

CREATE OR REPLACE FUNCTION public.ensure_project_chat_group_internal(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_project_name text;
  v_project_creator uuid;
  v_organization_id uuid;
BEGIN
  SELECT name, created_by, organization_id
  INTO v_project_name, v_project_creator, v_organization_id
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT pcg.conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups pcg
  WHERE pcg.project_id = p_project_id;

  -- IMPORTANT: if mapping already exists, do not overwrite editable metadata.
  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  IF v_project_creator IS NULL THEN
    SELECT om.user_id
    INTO v_project_creator
    FROM public.organization_members om
    WHERE om.organization_id = v_organization_id
    ORDER BY om.joined_at ASC
    LIMIT 1;
  END IF;

  IF v_project_creator IS NULL THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  INSERT INTO public.conversations (type, name, description, created_by)
  VALUES (
    'group',
    COALESCE(v_project_name, 'Project') || ' - Project Chat',
    'Auto-created project group chat',
    v_project_creator
  )
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.project_chat_groups (project_id, conversation_id)
  VALUES (p_project_id, v_conversation_id)
  ON CONFLICT (project_id) DO UPDATE
  SET conversation_id = EXCLUDED.conversation_id;

  RETURN v_conversation_id;
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
BEGIN
  SELECT created_by
  INTO v_project_creator
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- On-demand behavior: if chat group does not exist yet, do nothing.
  SELECT pcg.conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups pcg
  WHERE pcg.project_id = p_project_id;

  IF v_conversation_id IS NULL THEN
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
  IF NOT public.has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Explicit create path (called from UI "Start Chat").
  v_conversation_id := public.ensure_project_chat_group_internal(p_project_id);
  PERFORM public.sync_project_chat_group_members_internal(p_project_id);

  RETURN v_conversation_id;
END;
$$;
