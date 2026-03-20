-- Add missing foreign key from project_members to profiles.
-- This ensures PostgREST can find the relationship for implicit joins
-- and enables the single-query embedded select pattern used in the service layer.
--
-- ON DELETE CASCADE — REVIEWED AND INTENTIONAL.
-- Business rule: a project_member row is meaningless without its associated
-- profile. Cascading the delete avoids orphaned rows and is consistent with
-- the principle that project membership is derived from a user's profile
-- existence. Before changing profile deletion behaviour (e.g. to RESTRICT or
-- SET NULL), update the application's soft-delete logic in AuthContext.tsx and
-- any background cleanup jobs accordingly.
ALTER TABLE public.project_members
ADD CONSTRAINT fk_project_members_user_id
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
