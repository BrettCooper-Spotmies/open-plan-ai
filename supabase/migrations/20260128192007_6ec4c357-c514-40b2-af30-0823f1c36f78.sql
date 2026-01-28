-- Fix RLS policies for organizations table
-- The issue: when creating an organization, the SELECT policy fails because
-- the user isn't a member yet (the member row is inserted AFTER the org is created)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Create new SELECT policy that also allows viewing newly created organizations
-- by checking if the user is the creator (via created_by) OR a member
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      has_org_access(id) OR 
      -- Allow users to see organizations they're about to become a member of
      -- This is needed for the INSERT...SELECT flow
      EXISTS (
        SELECT 1 FROM auth.users WHERE auth.uid() IS NOT NULL
        AND id IN (
          SELECT user_id FROM public.organization_members WHERE organization_id = organizations.id
        )
      )
    )
  );

-- Actually, the simpler fix is to use a SECURITY DEFINER function
-- But the cleanest solution is to just allow authenticated users to see orgs they just created
-- Let's use a different approach: create a function that handles org creation atomically

-- First, let's just make the SELECT policy more permissive for the INSERT case
-- by using a SECURITY DEFINER function to create organizations

DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

-- Simpler approach: allow viewing if user is a member OR if they match by some criteria during insert
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND has_org_access(id)
  );

-- The real fix: Create a SECURITY DEFINER function for atomic organization creation
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org public.organizations;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the organization
  INSERT INTO public.organizations (name, slug, description)
  VALUES (org_name, org_slug, org_description)
  RETURNING * INTO new_org;

  -- Add creator as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org.id, current_user_id, 'owner');

  RETURN new_org;
END;
$$;