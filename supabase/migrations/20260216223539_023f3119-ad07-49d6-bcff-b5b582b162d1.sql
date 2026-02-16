ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS type text;
NOTIFY pgrst, 'reload schema';