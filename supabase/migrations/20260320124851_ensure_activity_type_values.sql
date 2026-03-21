-- Ensure all activity_type enum values referenced by frontend services exist.
-- This is idempotent and safe across environments.

ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'project_created';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'project_updated';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'project_assigned';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'dependency_added';

