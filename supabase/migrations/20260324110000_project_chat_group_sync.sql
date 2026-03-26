-- Auto-sync project membership with a dedicated project chat group.

CREATE TABLE IF NOT EXISTS public.project_chat_groups (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view project chat group mapping" ON public.project_chat_groups;
CREATE POLICY "Users can view project chat group mapping"
  ON public.project_chat_groups FOR SELECT
  TO authenticated
  USING (public.has_project_access(project_id));

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

  IF v_conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET
      name = COALESCE(v_project_name, 'Project') || ' - Project Chat',
      description = 'Auto-created project group chat',
      updated_at = now()
    WHERE id = v_conversation_id
      AND type = 'group';

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

  v_conversation_id := public.ensure_project_chat_group_internal(p_project_id);

  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_conversation_id
    AND cm.user_id NOT IN (
      SELECT pm.user_id
      FROM public.project_members pm
      WHERE pm.project_id = p_project_id
      UNION
      SELECT v_project_creator
      WHERE v_project_creator IS NOT NULL
    );

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    u.user_id,
    CASE
      WHEN u.user_id = v_project_creator THEN 'owner'
      ELSE 'member'
    END
  FROM (
    SELECT pm.user_id
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
    UNION
    SELECT v_project_creator
    WHERE v_project_creator IS NOT NULL
  ) AS u
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;
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

  PERFORM public.sync_project_chat_group_members_internal(p_project_id);

  SELECT conversation_id
  INTO v_conversation_id
  FROM public.project_chat_groups
  WHERE project_id = p_project_id;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_project_chat_group_members(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access Denied';
  END IF;

  PERFORM public.sync_project_chat_group_members_internal(p_project_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_project_chat_group_from_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  PERFORM public.sync_project_chat_group_members_internal(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_project_chat_group_from_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  v_project_id := COALESCE(NEW.project_id, OLD.project_id);
  PERFORM public.sync_project_chat_group_members_internal(v_project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_chat_group_on_project ON public.projects;
CREATE TRIGGER trg_sync_project_chat_group_on_project
AFTER INSERT OR UPDATE OF name, created_by ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_project_chat_group_from_project();

DROP TRIGGER IF EXISTS trg_sync_project_chat_group_on_members ON public.project_members;
CREATE TRIGGER trg_sync_project_chat_group_on_members
AFTER INSERT OR DELETE OR UPDATE OF user_id ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_project_chat_group_from_members();

REVOKE ALL ON FUNCTION public.ensure_project_chat_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_project_chat_group(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_project_chat_group_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_project_chat_group_members(uuid) TO authenticated;
