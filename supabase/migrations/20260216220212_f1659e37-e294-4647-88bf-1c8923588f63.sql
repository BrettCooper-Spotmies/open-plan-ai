
-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role org_role NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to prevent duplicate pending invites
CREATE UNIQUE INDEX idx_unique_pending_invite ON public.team_invitations (organization_id, email) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view invitations for their org
CREATE POLICY "Org members can view invitations"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING (has_org_access(organization_id));

-- Only admins/owners can insert invitations
CREATE POLICY "Org admins can create invitations"
  ON public.team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_org_role(organization_id, 'admin') OR has_org_role(organization_id, 'owner')
  );

-- Only admins/owners can update invitations (cancel, etc.)
CREATE POLICY "Org admins can update invitations"
  ON public.team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    has_org_role(organization_id, 'admin') OR has_org_role(organization_id, 'owner')
  );

-- Only admins/owners can delete invitations
CREATE POLICY "Org admins can delete invitations"
  ON public.team_invitations
  FOR DELETE
  TO authenticated
  USING (
    has_org_role(organization_id, 'admin') OR has_org_role(organization_id, 'owner')
  );
