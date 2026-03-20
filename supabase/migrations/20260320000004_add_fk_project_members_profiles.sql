-- Add missing foreign key from project_members to profiles
-- This ensures PostgREST can find the relationship for implicit joins
-- ON DELETE CASCADE is intentional: if a profile is deleted, dependent
-- project membership rows are cleaned up automatically to avoid orphans.
-- Review this behavior before changing profile deletion policies.

ALTER TABLE public.project_members
ADD CONSTRAINT fk_project_members_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
