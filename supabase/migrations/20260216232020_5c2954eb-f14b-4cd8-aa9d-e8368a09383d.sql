ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS department text;