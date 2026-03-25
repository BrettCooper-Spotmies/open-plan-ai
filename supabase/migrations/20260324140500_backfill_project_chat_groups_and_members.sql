-- Backfill existing projects so chat groups/members are in sync immediately.

DO $$
DECLARE
  v_project_id uuid;
BEGIN
  FOR v_project_id IN
    SELECT p.id
    FROM public.projects p
    WHERE p.deleted_at IS NULL
  LOOP
    PERFORM public.sync_project_chat_group_members_internal(v_project_id);
  END LOOP;
END;
$$;
