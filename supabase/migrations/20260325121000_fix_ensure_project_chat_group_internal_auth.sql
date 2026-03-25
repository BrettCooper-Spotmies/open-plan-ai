-- Defense-in-depth: even the internal helper must refuse to create
-- project chat groups unless the caller can start project chat.
-- This prevents future call paths from bypassing `can_start_project_chat`.

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
  -- Defence-in-depth:
  -- Only enforce the project-start-chat authorization when there is an authenticated
  -- caller context. Maintenance/migration paths often run with `auth.uid()` = NULL.
  IF auth.uid() IS NOT NULL AND NOT public.can_start_project_chat(p_project_id) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

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

