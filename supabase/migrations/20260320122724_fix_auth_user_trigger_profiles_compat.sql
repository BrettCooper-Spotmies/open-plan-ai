-- Ensure auth user creation trigger can always create/update a profile row.
-- This addresses production schema drift that can cause GoTrue errors:
-- "Database error creating new user".

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'profiles'
			AND column_name = 'email'
	) THEN
		ALTER TABLE public.profiles ADD COLUMN email TEXT NOT NULL DEFAULT '';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'profiles'
			AND column_name = 'name'
	) THEN
		ALTER TABLE public.profiles ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'profiles'
			AND column_name = 'initials'
	) THEN
		ALTER TABLE public.profiles ADD COLUMN initials TEXT NOT NULL DEFAULT 'UN';
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'profiles'
			AND column_name = 'avatar_url'
	) THEN
		ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
	END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

	RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
	AFTER INSERT ON auth.users
	FOR EACH ROW
	EXECUTE FUNCTION public.handle_new_user();

