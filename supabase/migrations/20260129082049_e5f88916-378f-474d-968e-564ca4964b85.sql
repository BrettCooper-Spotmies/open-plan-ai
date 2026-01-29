-- Fix 1: Restrict profiles table to show only organization members + own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their organizations"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR  -- Users can always see their own profile
    EXISTS (
      SELECT 1 FROM public.organization_members om1
      JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = profiles.id
    )
  );

-- Fix 2: Restrict email_verifications to service role only
DROP POLICY IF EXISTS "Service role can manage verifications" ON public.email_verifications;

CREATE POLICY "Only service role can manage verifications"
  ON public.email_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);