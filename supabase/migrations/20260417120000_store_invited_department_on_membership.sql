-- Persist invited department across team invite acceptance flows.
-- This ensures department shows consistently on Team page per organization membership.

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS department text;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_invitation_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invitation public.team_invitations%ROWTYPE;
  v_invitation_id uuid;
  v_updated_id uuid;
  v_generic_error text := 'Invalid or expired invitation';

  v_inv_norm text;
  v_jwt_email text;
  v_profile_email text;

  v_attempt int := 0;
  v_max_attempts int := 3;
  v_backoff_ms int := 150;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    WHERE pr.id = v_user_id
      AND pr.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  IF p_invitation_identifier IS NULL OR btrim(p_invitation_identifier) = '' THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  IF length(p_invitation_identifier) > 500 THEN
    RAISE EXCEPTION '%', v_generic_error;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    BEGIN
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

      IF v_invitation.status = 'expired' THEN
        RAISE EXCEPTION '%', v_generic_error;
      END IF;

      v_inv_norm := lower(trim(v_invitation.email));
      IF v_inv_norm IS NULL OR v_inv_norm = '' THEN
        RAISE EXCEPTION '%', v_generic_error;
      END IF;

      v_jwt_email := nullif(lower(trim(coalesce(auth.jwt()->>'email', ''))), '');

      SELECT nullif(lower(trim(email)), '')
      INTO v_profile_email
      FROM public.profiles
      WHERE id = v_user_id;

      IF (v_jwt_email IS NULL OR v_jwt_email = '')
         AND (v_profile_email IS NULL OR v_profile_email = '') THEN
        RAISE EXCEPTION '%', v_generic_error;
      END IF;

      IF NOT (
        (v_jwt_email IS NOT NULL AND v_inv_norm = v_jwt_email)
        OR (v_profile_email IS NOT NULL AND v_inv_norm = v_profile_email)
      ) THEN
        RAISE EXCEPTION '%', v_generic_error;
      END IF;

      IF v_invitation.expires_at < now() THEN
        UPDATE public.team_invitations
        SET status = 'expired'
        WHERE id = v_invitation.id;
        RAISE EXCEPTION '%', v_generic_error;
      END IF;

      INSERT INTO public.organization_members (
        organization_id,
        user_id,
        role,
        invited_by,
        department
      )
      VALUES (
        v_invitation.organization_id,
        v_user_id,
        v_invitation.role,
        v_invitation.invited_by,
        nullif(trim(v_invitation.department), '')
      )
      ON CONFLICT (organization_id, user_id) DO UPDATE
      SET
        role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        department = coalesce(public.organization_members.department, EXCLUDED.department);

      UPDATE public.team_invitations
      SET
        status = 'accepted',
        accepted_at = coalesce(accepted_at, now())
      WHERE id = v_invitation.id
        AND status = 'pending'
      RETURNING id INTO v_updated_id;

      RETURN jsonb_build_object(
        'success', true,
        'invitation_id', v_invitation.id,
        'already_accepted', (v_updated_id IS NULL)
      );
    EXCEPTION
      WHEN SQLSTATE '40P01' OR SQLSTATE '40001' THEN
        IF v_attempt >= v_max_attempts THEN
          RAISE;
        END IF;
        PERFORM pg_sleep(v_backoff_ms / 1000.0);
        v_backoff_ms := v_backoff_ms * 2;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_team_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(text) TO service_role;
