-- Add dependency arrays directly to the issues table for reliable read/write
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS blocked_by_task_ids text[] DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS blocks_task_ids text[] DEFAULT '{}' NOT NULL;

-- Backfill from junction tables if they exist
DO $$
BEGIN
  -- Backfill blocked_by_task_ids from issue_task_dependencies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'issue_task_dependencies') THEN
    UPDATE public.issues i
    SET blocked_by_task_ids = COALESCE((
      SELECT array_agg(d.depends_on_task_id::text)
      FROM public.issue_task_dependencies d
      WHERE d.issue_id = i.id
    ), '{}');
  END IF;

  -- Backfill blocks_task_ids from task_issue_dependencies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_issue_dependencies') THEN
    UPDATE public.issues i
    SET blocks_task_ids = COALESCE((
      SELECT array_agg(d.task_id::text)
      FROM public.task_issue_dependencies d
      WHERE d.depends_on_issue_id = i.id
    ), '{}');
  END IF;
END $$;
