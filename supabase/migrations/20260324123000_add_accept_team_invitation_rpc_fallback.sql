-- Fallback RPC for invitation acceptance.
-- This ensures invite acceptance still works even if the edge function is not deployed.

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invitation_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := lower(coalesce(auth.jwt()->>'email', ''));
  v_invitation public.team_invitations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be logged in to accept an invitation';
  END IF;

  IF p_invitation_identifier IS NULL OR btrim(p_invitation_identifier) = '' THEN
    RAISE EXCEPTION 'Missing invitation identifier';
  END IF;

  IF length(p_invitation_identifier) > 500 THEN
    RAISE EXCEPTION 'Invalid invitation identifier format';
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.team_invitations
  WHERE status = 'pending'
    AND (id::text = p_invitation_identifier OR token = p_invitation_identifier)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF v_invitation.expires_at < now() THEN
    UPDATE public.team_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;

    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  IF v_user_email = '' THEN
    SELECT lower(email)
    INTO v_user_email
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RAISE EXCEPTION 'Unable to verify your email address for this invitation';
  END IF;

  IF lower(v_invitation.email) <> v_user_email THEN
    RAISE EXCEPTION 'This invitation is for a different email address';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = v_invitation.organization_id
      AND user_id = v_user_id
  ) THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role,
      invited_by
    )
    VALUES (
      v_invitation.organization_id,
      v_user_id,
      v_invitation.role,
      v_invitation.invited_by
    );
  END IF;

  UPDATE public.team_invitations
  SET
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now())
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'invitation_id', v_invitation.id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO service_role;
