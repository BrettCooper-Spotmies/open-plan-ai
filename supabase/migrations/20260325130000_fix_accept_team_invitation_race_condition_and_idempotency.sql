-- Fix race conditions in invitation acceptance.
-- Multiple concurrent accepts could previously both observe `status='pending'`
-- and pass the `expires_at < now()` check outside a critical section.
--
-- This implementation locks the invitation row and makes the accept operation
-- idempotent for already-accepted invitations.

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
  v_invitation_id uuid;
  v_updated_id uuid;
  v_generic_error text := 'Invalid or expired invitation';
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  IF p_invitation_identifier IS NULL OR btrim(p_invitation_identifier) = '' THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  IF length(p_invitation_identifier) > 500 THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  -- Lock the invitation row to serialize concurrent accept attempts.
  SELECT id
  INTO v_invitation_id
  FROM public.team_invitations
  WHERE (id::text = p_invitation_identifier OR token = p_invitation_identifier)
  LIMIT 1
  FOR UPDATE;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  SELECT *
  INTO v_invitation
  FROM public.team_invitations
  WHERE id = v_invitation_id;

  -- If invitation already expired, reject immediately.
  IF v_invitation.status = 'expired' THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  -- Normalize email from profile if JWT doesn't include it.
  IF v_user_email = '' THEN
    SELECT lower(email)
    INTO v_user_email
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  IF v_user_email IS NULL OR v_user_email = '' THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  -- Validate invitation is for the same email.
  IF lower(v_invitation.email) <> v_user_email THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  -- Expiry check is performed while the row is locked.
  IF v_invitation.expires_at < now() THEN
    UPDATE public.team_invitations
    SET status = 'expired'
    WHERE id = v_invitation.id;
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  -- Ensure membership insert is idempotent under concurrent accepts.
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
  )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Only transition to accepted if it's still pending.
  UPDATE public.team_invitations
  SET
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now())
  WHERE id = v_invitation.id
    AND status = 'pending'
  RETURNING id INTO v_updated_id;

  -- If already accepted by another concurrent transaction, this is still success.
  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation.id,
    'already_accepted', (v_updated_id IS NULL)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO service_role;

