-- Project group chat membership should mirror the project team (plus optional
-- explicit "keep in chat after project removal"), not the whole organization.
-- Adds retain_in_project_chat on project_chat_member_access and restores sync
-- semantics aligned with 20260324180000 while keeping advisory locking from
-- 20260328160000.

ALTER TABLE public.project_chat_member_access
  ADD COLUMN IF NOT EXISTS retain_in_project_chat boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.set_project_chat_retain_membership_batch(
  p_project_id uuid,
  p_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_manage_project_members(p_project_id) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_chat_groups pcg WHERE pcg.project_id = p_project_id
  ) THEN
    RETURN;
  END IF;

  SELECT array_agg(DISTINCT u)
  INTO v_ids
  FROM unnest(p_user_ids) AS u
  WHERE u IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles pr WHERE pr.id = u AND pr.deleted_at IS NULL
    );

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.project_chat_member_access (
    project_id,
    user_id,
    joined_at,
    left_at,
    retain_in_project_chat,
    updated_at
  )
  SELECT
    p_project_id,
    x.user_id,
    now(),
    NULL,
    true,
    now()
  FROM unnest(v_ids) AS x(user_id)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET
    retain_in_project_chat = true,
    left_at = NULL,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_project_chat_retain_membership_batch(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_project_chat_retain_membership_batch(uuid, uuid[]) TO authenticated;

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
  v_deleted_batch_rows int := 0;
  v_batch_size int := 2000;
  v_eligible_user_ids uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  SELECT created_by
  INTO v_project_creator
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

  -- Active project team + creator: clear departure marker and drop retain flag while on the team.
  INSERT INTO public.project_chat_member_access (
    project_id,
    user_id,
    joined_at,
    left_at,
    retain_in_project_chat,
    updated_at
  )
  SELECT
    p_project_id,
    u.user_id,
    now(),
    NULL,
    false,
    now()
  FROM (
    SELECT DISTINCT pm.user_id
    FROM public.project_members pm
    INNER JOIN public.profiles pr ON pr.id = pm.user_id AND pr.deleted_at IS NULL
    WHERE pm.project_id = p_project_id
    UNION
    SELECT v_project_creator
    WHERE v_project_creator IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles pr2
        WHERE pr2.id = v_project_creator AND pr2.deleted_at IS NULL
      )
  ) AS u(user_id)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET
    left_at = NULL,
    retain_in_project_chat = false,
    updated_at = now();

  -- Users no longer on the team and not explicitly retained: mark departed.
  UPDATE public.project_chat_member_access pca
  SET
    left_at = COALESCE(pca.left_at, now()),
    updated_at = now()
  WHERE pca.project_id = p_project_id
    AND pca.retain_in_project_chat = false
    AND pca.user_id NOT IN (
      SELECT pm.user_id FROM public.project_members pm WHERE pm.project_id = p_project_id
      UNION
      SELECT v_project_creator WHERE v_project_creator IS NOT NULL
    );

  -- Retained ex-members stay active in access history.
  UPDATE public.project_chat_member_access pca
  SET
    left_at = NULL,
    updated_at = now()
  WHERE pca.project_id = p_project_id
    AND pca.retain_in_project_chat = true
    AND pca.user_id NOT IN (
      SELECT pm.user_id FROM public.project_members pm WHERE pm.project_id = p_project_id
      UNION
      SELECT v_project_creator WHERE v_project_creator IS NOT NULL
    );

  SELECT array_agg(DISTINCT x.user_id)
  INTO v_eligible_user_ids
  FROM (
    SELECT pm.user_id AS user_id
    FROM public.project_members pm
    INNER JOIN public.profiles pr ON pr.id = pm.user_id AND pr.deleted_at IS NULL
    WHERE pm.project_id = p_project_id
    UNION ALL
    SELECT v_project_creator AS user_id
    WHERE v_project_creator IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles pr2 WHERE pr2.id = v_project_creator AND pr2.deleted_at IS NULL
      )
    UNION ALL
    SELECT pca.user_id AS user_id
    FROM public.project_chat_member_access pca
    INNER JOIN public.profiles pr3 ON pr3.id = pca.user_id AND pr3.deleted_at IS NULL
    WHERE pca.project_id = p_project_id
      AND pca.retain_in_project_chat = true
  ) AS x;

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
