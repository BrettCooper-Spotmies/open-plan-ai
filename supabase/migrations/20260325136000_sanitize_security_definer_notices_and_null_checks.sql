-- Harden SECURITY DEFINER functions:
-- - Mask sensitive identifiers in RAISE NOTICE logs
-- - Add missing NULL checks and validate creator profile existence

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
    RAISE NOTICE '[ensure_project_chat_group_internal] Access Denied: project not found or deleted (p_project_last=%)', right(p_project_id::text, 8);
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF v_organization_id IS NULL THEN
    RAISE NOTICE '[ensure_project_chat_group_internal] Access Denied: project missing organization_id (p_project_last=%)', right(p_project_id::text, 8);
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
    ORDER BY om.joined_at ASC NULLS LAST, om.user_id ASC
    LIMIT 1;
  END IF;

  IF v_project_creator IS NULL THEN
    RAISE NOTICE '[ensure_project_chat_group_internal] Access Denied: cannot determine project creator (p_project_last=% org_last=%)',
      right(p_project_id::text, 8), right(v_organization_id::text, 8);
    RAISE EXCEPTION 'Access Denied';
  END IF;

  -- Ensure creator has a non-deleted profile.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = v_project_creator
      AND pr.deleted_at IS NULL
  ) THEN
    RAISE NOTICE '[ensure_project_chat_group_internal] Access Denied: resolved creator has no active profile (creator_last=%)',
      right(v_project_creator::text, 8);
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

-- Keep internal helper callable restriction consistent with prior migration
REVOKE ALL ON FUNCTION public.ensure_project_chat_group_internal(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ensure_project_creator_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid uuid := auth.uid();
  v_caller_role text := coalesce(auth.jwt()->>'role', '');
BEGIN
  -- Allow trusted service-role inserts without enforcing created_by.
  -- For normal authenticated callers, require created_by to match auth.uid().
  IF v_caller_uid IS NOT NULL
     AND v_caller_role <> 'service_role'
     AND NEW.created_by IS DISTINCT FROM v_caller_uid THEN
    RAISE NOTICE '[ensure_project_creator_membership] Access Denied: created_by mismatch (caller_last=% new_created_by_last=%)',
      right(v_caller_uid::text, 8), right(NEW.created_by::text, 8);
    RAISE EXCEPTION 'Access Denied';
  END IF;

  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure creator has a non-deleted profile.
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = NEW.created_by
      AND pr.deleted_at IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role, added_by)
  VALUES (NEW.id, NEW.created_by, 'Admin', NEW.created_by)
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = 'Admin';

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.force_remove_project_chat_members(
  p_project_id uuid,
  p_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_user_ids uuid[];
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Deduplicate + drop NULLs to avoid unexpected ANY(...) behavior.
  SELECT array_agg(DISTINCT u)
  INTO v_user_ids
  FROM unnest(p_user_ids) u
  WHERE u IS NOT NULL;

  IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.can_manage_project_members(p_project_id) THEN
    RAISE NOTICE '[force_remove_project_chat_members] Access Denied: caller cannot manage members (p_project_last=% caller_last=%)',
      right(p_project_id::text, 8), right(auth.uid()::text, 8);
    RAISE EXCEPTION 'Access Denied';
  END IF;

  SELECT pcg.conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups pcg
  WHERE pcg.project_id = p_project_id;

  IF v_conversation_id IS NULL THEN
    RETURN;
  END IF;

  -- Remove from active conversation members.
  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_conversation_id
    AND cm.user_id = ANY(v_user_ids);

  -- Remove access-history rows so future syncs do not re-add them automatically.
  DELETE FROM public.project_chat_member_access pca
  WHERE pca.project_id = p_project_id
    AND pca.user_id = ANY(v_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.force_remove_project_chat_members(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_remove_project_chat_members(uuid, uuid[]) TO authenticated;

