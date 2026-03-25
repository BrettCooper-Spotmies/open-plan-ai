-- Enforce uniqueness of project_chat_member_access rows.
-- Even if the table is expected to have a PRIMARY KEY (project_id, user_id),
-- duplicates can exist due to prior schema/version drift or replication issues.

DO $$
DECLARE
  v_deleted_rows int := 0;
BEGIN
  -- Delete duplicates, keeping the earliest row deterministically.
  WITH ranked AS (
    SELECT
      ctid,
      row_number() OVER (
        PARTITION BY project_id, user_id
        ORDER BY joined_at ASC NULLS LAST, created_at ASC NULLS LAST
      ) AS rn
    FROM public.project_chat_member_access
  )
  DELETE FROM public.project_chat_member_access
  WHERE ctid IN (
    SELECT ctid
    FROM ranked
    WHERE rn > 1
  );

  GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;
  RAISE NOTICE '[deduplicate_project_chat_member_access] deleted % duplicate rows', v_deleted_rows;
END;
$$;

-- After cleanup, enforce uniqueness to prevent recurrence.
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_chat_member_access_unique
  ON public.project_chat_member_access (project_id, user_id);

