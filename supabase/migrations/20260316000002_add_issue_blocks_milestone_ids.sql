-- Persist milestone links on issues so milestone-blocking relationships survive refetches.
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS blocks_milestone_ids text[] DEFAULT '{}' NOT NULL;
