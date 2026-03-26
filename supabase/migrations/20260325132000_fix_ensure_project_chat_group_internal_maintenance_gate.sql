-- Maintenance compatibility for project-chat sync/cleanup:
-- `sync_project_chat_group_members_internal` is called from cleanup/migration
-- paths that may run with a SQL-editor user who is NOT a member of every
-- project. `ensure_project_chat_group_internal` must therefore not depend on
-- `can_start_project_chat()` / `auth.uid()` membership checks.
--
-- Direct creation should remain protected via the public entrypoint
-- `ensure_project_chat_group(p_project_id)` (which enforces can_start_project_chat).
-- We additionally revoke execute on this internal helper from PUBLIC.

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

REVOKE ALL ON FUNCTION public.ensure_project_chat_group_internal(uuid) FROM PUBLIC;

