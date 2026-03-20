-- Add missing bio column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;

-- Create index for faster queries if needed
CREATE INDEX IF NOT EXISTS idx_profiles_bio ON public.profiles(bio) WHERE bio IS NOT NULL;
