-- Drop overly permissive logo policies
DROP POLICY IF EXISTS "Org members can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete logos" ON storage.objects;

-- Create more restrictive logo policies that check organization membership
CREATE POLICY "Org members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Org members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = auth.uid()
  )
);