
-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for project-files bucket
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can update project files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'project-files');
