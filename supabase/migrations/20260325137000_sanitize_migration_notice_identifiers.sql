-- Sanitize migration/maintenance NOTICE logs:
-- - Mask sensitive identifiers (project_id, conversation_id)
-- - Reduce verbosity by logging only when deletions occur

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

  IF v_deleted_rows > 0 THEN
    RAISE NOTICE '[sync_project_chat_group_members_internal] deleted-mismatch conversation_members (project_last=% conv_last=% deleted=%)',
      right(p_project_id::text, 8),
      right(coalesce(v_conversation_id::text, ''), 8),
      v_deleted_rows;
  END IF;

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

CREATE OR REPLACE FUNCTION public.handle_project_chat_on_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_deleted_member_access_rows int := 0;
  v_deleted_mapping_rows int := 0;
  v_deleted_conversation_rows int := 0;
BEGIN
  -- Only act when deleted_at changes.
  IF TG_OP = 'UPDATE' AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
    -- Project soft-deleted -> remove chat mapping + conversation.
    IF NEW.deleted_at IS NOT NULL THEN
      SELECT pcg.conversation_id
      INTO v_conversation_id
      FROM public.project_chat_groups pcg
      WHERE pcg.project_id = NEW.id;

      -- Remove access-history rows for this project.
      DELETE FROM public.project_chat_member_access
      WHERE project_id = NEW.id;

      GET DIAGNOSTICS v_deleted_member_access_rows = ROW_COUNT;

      -- Remove mapping row (if present).
      DELETE FROM public.project_chat_groups
      WHERE project_id = NEW.id;

      GET DIAGNOSTICS v_deleted_mapping_rows = ROW_COUNT;

      -- Remove conversation to fully hide from chat lists and clear memberships/messages.
      IF v_conversation_id IS NOT NULL THEN
        DELETE FROM public.conversations
        WHERE id = v_conversation_id
          AND type = 'group';

        GET DIAGNOSTICS v_deleted_conversation_rows = ROW_COUNT;
      END IF;

      IF (v_deleted_member_access_rows + v_deleted_mapping_rows + v_deleted_conversation_rows) > 0 THEN
        RAISE NOTICE '[handle_project_chat_on_soft_delete] project chat removed (project_last=% conv_last=% member_access_del=% mapping_del=% conversation_del=%)',
          right(NEW.id::text, 8),
          right(coalesce(v_conversation_id::text, ''), 8),
          v_deleted_member_access_rows,
          v_deleted_mapping_rows,
          v_deleted_conversation_rows;
      END IF;
    ELSE
      -- Project restored -> rebuild chat group and members.
      PERFORM public.sync_project_chat_group_members_internal(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

