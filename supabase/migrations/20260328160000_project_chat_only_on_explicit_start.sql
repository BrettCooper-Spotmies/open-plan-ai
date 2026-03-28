-- Project group chats should exist only after a team member uses "Start Chat"
-- (RPC ensure_project_chat_group). Do not auto-create from project INSERT or
-- project_members changes.
--
-- 1) sync_project_chat_group_members_internal: sync only when project_chat_groups
--    already has a row (reverts accidental reintroduction via later migrations).
-- 2) trg_sync_project_chat_group_on_project: run AFTER UPDATE only, not INSERT.

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
  v_deleted_batch_rows int := 0;
  v_batch_size int := 2000;
  v_eligible_user_ids uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  SELECT created_by, organization_id
  INTO v_project_creator, v_organization_id
  FROM public.projects
  WHERE id = p_project_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT pcg.conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups pcg
  WHERE pcg.project_id = p_project_id;

  IF v_conversation_id IS NULL THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT p.id)
  INTO v_eligible_user_ids
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
    );

  IF v_eligible_user_ids IS NULL THEN
    v_eligible_user_ids := ARRAY[]::uuid[];
  END IF;

  LOOP
    WITH to_delete AS (
      SELECT cm.id
      FROM public.conversation_members cm
      WHERE cm.conversation_id = v_conversation_id
        AND NOT (cm.user_id = ANY(v_eligible_user_ids))
      LIMIT v_batch_size
    )
    DELETE FROM public.conversation_members cm
    USING to_delete
    WHERE cm.id = to_delete.id;

    GET DIAGNOSTICS v_deleted_batch_rows = ROW_COUNT;
    EXIT WHEN v_deleted_batch_rows = 0;
    v_deleted_rows := v_deleted_rows + v_deleted_batch_rows;
  END LOOP;

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
  FROM unnest(v_eligible_user_ids) AS u(user_id)
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = CASE
    WHEN EXCLUDED.user_id = v_project_creator THEN 'owner'
    ELSE 'member'
  END;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_chat_group_on_project ON public.projects;
CREATE TRIGGER trg_sync_project_chat_group_on_project
AFTER UPDATE OF name, created_by ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_project_chat_group_from_project();
