-- Allow explicit removal of former project members from project chat.
-- This supports the UI choice:
-- - No  -> remove from project only (keep chat history access)
-- - Yes -> remove from project and from project chat members list

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
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.has_project_access(p_project_id) THEN
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
    AND cm.user_id = ANY(p_user_ids);

  -- Remove access-history rows so future syncs do not re-add them automatically.
  DELETE FROM public.project_chat_member_access pca
  WHERE pca.project_id = p_project_id
    AND pca.user_id = ANY(p_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.force_remove_project_chat_members(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_remove_project_chat_members(uuid, uuid[]) TO authenticated;
