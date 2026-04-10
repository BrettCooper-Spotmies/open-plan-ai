-- Fix avatar updates when legacy profiles rows don't match auth.uid() or
-- when profiles INSERT policy is restricted by RLS.
-- Provides a secure RPC the client can call to update avatar_url reliably.

CREATE OR REPLACE FUNCTION public.update_my_profile_avatar(p_avatar_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_updated integer := 0;
  v_has_user_id boolean := false;
  v_email text := '';
  v_name text := 'User';
  v_initials text := 'U';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Primary schema: profiles.id = auth.users.id
  UPDATE public.profiles
  SET avatar_url = p_avatar_url
  WHERE id = v_uid;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated > 0 THEN
    RETURN;
  END IF;

  -- Legacy schema compatibility: profiles.user_id exists in some deployments.
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'user_id'
  ) INTO v_has_user_id;

  IF v_has_user_id THEN
    EXECUTE 'UPDATE public.profiles SET avatar_url = $1 WHERE user_id = $2'
    USING p_avatar_url, v_uid;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      RETURN;
    END IF;
  END IF;

  -- If no row exists, create canonical row keyed by auth uid.
  SELECT
    COALESCE(u.email, ''),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'name', ''), NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(COALESCE(u.email, 'User'), '@', 1), 'User')
  INTO v_email, v_name
  FROM auth.users u
  WHERE u.id = v_uid
  LIMIT 1;

  v_initials := LEFT(
    UPPER(
      REGEXP_REPLACE(
        COALESCE(v_name, 'U'),
        '(^\s*([A-Za-z])).*?(?:\s+([A-Za-z]).*)?$',
        '\2\3'
      )
    ),
    2
  );
  IF v_initials IS NULL OR v_initials = '' THEN
    v_initials := 'U';
  END IF;

  INSERT INTO public.profiles (id, email, name, initials, avatar_url)
  VALUES (v_uid, v_email, v_name, v_initials, p_avatar_url)
  ON CONFLICT (id) DO UPDATE
  SET avatar_url = EXCLUDED.avatar_url;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile_avatar(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile_avatar(text) TO authenticated;
