-- Change project_members.role to TEXT to allow for custom role titles
-- This is necessary because the current project_role enum is too restrictive

-- 1. Temporarily change the column type to TEXT
ALTER TABLE public.project_members ALTER COLUMN role TYPE TEXT;

-- 2. (Optional) We can now drop the enum if it's no longer used elsewhere, 
-- but it's safer to keep it for now if other tables reference it.
-- However, for projects, we want the flexibility of custom roles.

-- We also check if organization_members needs the same change
-- ALTER TABLE public.organization_members ALTER COLUMN role TYPE TEXT;
