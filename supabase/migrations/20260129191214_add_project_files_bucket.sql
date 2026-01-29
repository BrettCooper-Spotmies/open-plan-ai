-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-files bucket
-- Authenticated users can upload to any project folder
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- Authenticated users can update their uploaded files
CREATE POLICY "Authenticated users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');

-- Authenticated users can delete project files
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');

-- Anyone can read project files (public bucket)
CREATE POLICY "Anyone can read project files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'project-files');
