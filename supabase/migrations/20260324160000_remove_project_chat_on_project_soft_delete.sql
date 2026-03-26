-- Remove project chat groups when a project is soft-deleted.
-- This ensures deleted projects no longer appear in Chat/Teams UI.

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

      RAISE NOTICE '[handle_project_chat_on_soft_delete] project_id=% conversation_id=% deleted_member_access_rows=% deleted_mapping_rows=% deleted_conversations_rows=%',
        NEW.id, v_conversation_id, v_deleted_member_access_rows, v_deleted_mapping_rows, v_deleted_conversation_rows;
    ELSE
      -- Project restored -> rebuild chat group and members.
      PERFORM public.sync_project_chat_group_members_internal(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_chat_on_soft_delete ON public.projects;
CREATE TRIGGER trg_project_chat_on_soft_delete
AFTER UPDATE OF deleted_at ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_project_chat_on_soft_delete();

-- Backfill cleanup for already soft-deleted projects.
DO $$
DECLARE
  v_project_id uuid;
  v_conversation_id uuid;
BEGIN
  FOR v_project_id IN
    SELECT p.id
    FROM public.projects p
    WHERE p.deleted_at IS NOT NULL
  LOOP
    SELECT pcg.conversation_id
    INTO v_conversation_id
    FROM public.project_chat_groups pcg
    WHERE pcg.project_id = v_project_id;

    DELETE FROM public.project_chat_member_access
    WHERE project_id = v_project_id;

    DELETE FROM public.project_chat_groups
    WHERE project_id = v_project_id;

    IF v_conversation_id IS NOT NULL THEN
      DELETE FROM public.conversations
      WHERE id = v_conversation_id
        AND type = 'group';
    END IF;
  END LOOP;
END;
$$;
