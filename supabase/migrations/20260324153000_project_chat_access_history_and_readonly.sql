-- Preserve project chat visibility for previously-participating users while
-- blocking new participation after removal from project membership.

CREATE TABLE IF NOT EXISTS public.project_chat_member_access (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_chat_member_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own project chat access" ON public.project_chat_member_access;
CREATE POLICY "Users can view their own project chat access"
  ON public.project_chat_member_access FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages project chat access" ON public.project_chat_member_access;
CREATE POLICY "Service role manages project chat access"
  ON public.project_chat_member_access FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

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

  -- Mark active members (project members + creator) as active in access history.
  INSERT INTO public.project_chat_member_access (project_id, user_id, joined_at, left_at)
  SELECT
    p_project_id,
    u.user_id,
    now(),
    NULL
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
        OR p.id = v_project_creator
      )
  ) AS u
  ON CONFLICT (project_id, user_id) DO UPDATE
  SET
    left_at = NULL,
    updated_at = now();

  -- Mark previously active users as removed once they are not in current project scope.
  UPDATE public.project_chat_member_access pca
  SET
    left_at = COALESCE(pca.left_at, now()),
    updated_at = now()
  WHERE pca.project_id = p_project_id
    AND pca.user_id NOT IN (
      SELECT p.id
      FROM public.profiles p
      WHERE p.deleted_at IS NULL
        AND (
          p.id IN (
            SELECT pm.user_id
            FROM public.project_members pm
            WHERE pm.project_id = p_project_id
          )
          OR p.id = v_project_creator
        )
    );

  -- Remove stale users with no profile row from chat membership.
  DELETE FROM public.conversation_members cm
  WHERE cm.conversation_id = v_conversation_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = cm.user_id
        AND p.deleted_at IS NULL
    );

  -- Ensure conversation includes everyone who has ever had access history for this project.
  INSERT INTO public.conversation_members (conversation_id, user_id, role)
  SELECT
    v_conversation_id,
    pca.user_id,
    CASE
      WHEN pca.user_id = v_project_creator THEN 'owner'
      ELSE 'member'
    END
  FROM public.project_chat_member_access pca
  WHERE pca.project_id = p_project_id
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET role = CASE
    WHEN EXCLUDED.user_id = v_project_creator THEN 'owner'
    ELSE 'member'
  END;
END;
$$;

-- Backfill existing projects to initialize access history.
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
