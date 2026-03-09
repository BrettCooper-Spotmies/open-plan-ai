
-- Add avatar_url column to conversations table for group icons/emojis
ALTER TABLE public.conversations ADD COLUMN avatar_url text;
