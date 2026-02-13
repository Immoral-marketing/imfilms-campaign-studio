-- Allow public access to view materials (if they are public links)
CREATE POLICY "Public Access Materials"
ON storage.objects FOR SELECT
USING ( bucket_id = 'campaign-materials' );

-- Allow authenticated users to upload materials
CREATE POLICY "Authenticated Users Upload Materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-materials' AND
  auth.role() = 'authenticated'
);

-- Allow owners and admins to update/delete
CREATE POLICY "Owners and Admins Update Materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-materials' AND
  (auth.uid() = owner OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Owners and Admins Delete Materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-materials' AND
  (auth.uid() = owner OR has_role(auth.uid(), 'admin'))
);
