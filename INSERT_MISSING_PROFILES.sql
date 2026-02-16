-- =====================================================
-- INSERT MISSING PROFILES
-- =====================================================
-- The profiles table is empty but auth.users has 2 users.
-- This script creates profile records for each auth user.
-- Run this in the Supabase SQL Editor.
-- =====================================================

-- Insert profiles for all auth users that don't already have one
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

-- Verify the results
SELECT id, email, name, initials FROM profiles;
