
-- Allow unauthenticated users to read pending invitations by token (for signup pre-fill)
CREATE POLICY "Anyone can read pending invitations by token"
ON public.team_invitations
FOR SELECT
USING (status = 'pending');
