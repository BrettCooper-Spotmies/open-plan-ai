-- Make auth signup resilient: profile-sync trigger must never block auth.users insert.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
	BEGIN
		INSERT INTO public.profiles (id, email, name, initials)
		VALUES (
			NEW.id,
			COALESCE(NEW.email, ''),
			COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'User'),
			UPPER(LEFT(COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, ''), '@', 1), 'US'), 2))
		)
		ON CONFLICT (id) DO UPDATE
		SET
			email = EXCLUDED.email,
			name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
			initials = COALESCE(NULLIF(EXCLUDED.initials, ''), public.profiles.initials);
	EXCEPTION
		WHEN OTHERS THEN
			-- Never fail auth signups because of profile synchronization drift.
			RAISE WARNING 'handle_new_user profile sync failed for user %: %', NEW.id, SQLERRM;
	END;

	RETURN NEW;
END;
$$;

