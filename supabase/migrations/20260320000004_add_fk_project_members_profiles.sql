-- Add missing foreign key from project_members to profiles
-- This ensures PostgREST can find the relationship for implicit joins

ALTER TABLE public.project_members
ADD CONSTRAINT fk_project_members_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
