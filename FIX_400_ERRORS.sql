-- =====================================================
-- FIX 400 ERRORS ON TASKS & ISSUES QUERIES
-- =====================================================
-- These 400 errors occur because the PostgREST schema cache
-- doesn't recognize certain columns or relationships.
-- 
-- Run this in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =====================================================

-- STEP 1: Ensure profiles table has ALL required columns
DO $$
BEGIN
  RAISE NOTICE 'Step 1: Checking profiles table columns...';

  -- Add initials if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'initials'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN initials TEXT NOT NULL DEFAULT 'UN';
    RAISE NOTICE 'Added initials column to profiles';
  ELSE
    RAISE NOTICE 'initials column already exists';
  END IF;

  -- Add avatar_url if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    RAISE NOTICE 'Added avatar_url column to profiles';
  ELSE
    RAISE NOTICE 'avatar_url column already exists';
  END IF;

  -- Add name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown';
    RAISE NOTICE 'Added name column to profiles';
  ELSE
    RAISE NOTICE 'name column already exists';
  END IF;

  -- Add email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT NOT NULL DEFAULT '';
    RAISE NOTICE 'Added email column to profiles';
  ELSE
    RAISE NOTICE 'email column already exists';
  END IF;

  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to profiles';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;

  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to profiles';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;

  -- Add deleted_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
    RAISE NOTICE 'Added deleted_at column to profiles';
  ELSE
    RAISE NOTICE 'deleted_at column already exists';
  END IF;
END $$;

-- STEP 2: Ensure issues table has due_date column
DO $$
BEGIN
  RAISE NOTICE 'Step 2: Checking issues table columns...';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'issues' 
    AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.issues ADD COLUMN due_date TIMESTAMPTZ;
    RAISE NOTICE 'Added due_date column to issues';
  ELSE
    RAISE NOTICE 'due_date column already exists in issues';
  END IF;
END $$;

-- STEP 3: Ensure projects table has type column
DO $$
BEGIN
  RAISE NOTICE 'Step 3: Checking projects table columns...';

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'projects' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN type TEXT;
    RAISE NOTICE 'Added type column to projects';
  ELSE
    RAISE NOTICE 'type column already exists in projects';
  END IF;
END $$;

-- STEP 4: Ensure profile records exist for all auth users
INSERT INTO profiles (id, email, name, initials, avatar_url, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    SPLIT_PART(au.email, '@', 1)
  ) AS name,
  UPPER(
    CASE 
      WHEN au.raw_user_meta_data->>'name' IS NOT NULL THEN
        LEFT(au.raw_user_meta_data->>'name', 1) || 
        COALESCE(LEFT(SPLIT_PART(au.raw_user_meta_data->>'name', ' ', 2), 1), '')
      ELSE
        LEFT(SPLIT_PART(au.email, '@', 1), 2)
    END
  ) AS initials,
  au.raw_user_meta_data->>'avatar_url' AS avatar_url,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- STEP 5: Update any profiles that have NULL initials
UPDATE profiles 
SET initials = UPPER(LEFT(COALESCE(name, SPLIT_PART(email, '@', 1)), 2))
WHERE initials IS NULL OR initials = '';

-- STEP 6: Verify foreign key constraints exist
-- Check issues_reported_by_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'issues_reported_by_fkey'
    AND table_name = 'issues'
  ) THEN
    ALTER TABLE issues 
    ADD CONSTRAINT issues_reported_by_fkey 
    FOREIGN KEY (reported_by) REFERENCES profiles(id);
    RAISE NOTICE 'Added issues_reported_by_fkey constraint';
  ELSE
    RAISE NOTICE 'issues_reported_by_fkey constraint already exists';
  END IF;
END $$;

-- Check issue_assignees_user_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'issue_assignees_user_id_fkey'
    AND table_name = 'issue_assignees'
  ) THEN
    ALTER TABLE issue_assignees 
    ADD CONSTRAINT issue_assignees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added issue_assignees_user_id_fkey constraint';
  ELSE
    RAISE NOTICE 'issue_assignees_user_id_fkey constraint already exists';
  END IF;
END $$;

-- Check task_assignees_user_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_assignees_user_id_fkey'
    AND table_name = 'task_assignees'
  ) THEN
    ALTER TABLE task_assignees 
    ADD CONSTRAINT task_assignees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added task_assignees_user_id_fkey constraint';
  ELSE
    RAISE NOTICE 'task_assignees_user_id_fkey constraint already exists';
  END IF;
END $$;

-- Check task_dependencies_task_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_dependencies_task_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE task_dependencies 
    ADD CONSTRAINT task_dependencies_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added task_dependencies_task_id_fkey constraint';
  ELSE
    RAISE NOTICE 'task_dependencies_task_id_fkey constraint already exists';
  END IF;
END $$;

-- Check task_dependencies_depends_on_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_dependencies_depends_on_id_fkey'
    AND table_name = 'task_dependencies'
  ) THEN
    ALTER TABLE task_dependencies 
    ADD CONSTRAINT task_dependencies_depends_on_id_fkey 
    FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added task_dependencies_depends_on_id_fkey constraint';
  ELSE
    RAISE NOTICE 'task_dependencies_depends_on_id_fkey constraint already exists';
  END IF;
END $$;

-- STEP 7: Reload PostgREST schema cache
-- This is CRITICAL - without this, PostgREST won't see the new columns/constraints
NOTIFY pgrst, 'reload schema';

-- STEP 8: Verify everything looks correct
SELECT 'Profiles table columns:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT 'Issues table columns:' AS info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'issues'
ORDER BY ordinal_position;

SELECT 'Foreign key constraints on issues:' AS info;
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY'
AND table_name IN ('issues', 'issue_assignees', 'task_assignees', 'task_dependencies');

SELECT 'Profile records:' AS info;
SELECT id, email, name, initials FROM profiles;

-- =====================================================
-- DONE! After running this:
-- 1. Wait a few seconds for PostgREST to reload
-- 2. Refresh your browser (Cmd+Shift+R for hard refresh)
-- 3. The projects page should now load correctly!
-- =====================================================
