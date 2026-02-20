
-- 1. Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS policies for chat-attachments bucket
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] IS NOT NULL AND auth.uid() IS NOT NULL);

-- 3. Add last_seen_at column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;
