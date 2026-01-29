-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-assets', 'campaign-assets', true)
ON CONFLICT (id) DO NOTHING;

-- STORAGE POLICIES
-- Allow public access to view assets
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'campaign-assets' );

-- Allow authenticated users (Admins & Distributors) to upload assets
CREATE POLICY "Authenticated Users Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-assets' AND
  auth.role() = 'authenticated'
);

-- Allow owners and admins to update/delete
CREATE POLICY "Owners and Admins Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-assets' AND
  (auth.uid() = owner OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Owners and Admins Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-assets' AND
  (auth.uid() = owner OR has_role(auth.uid(), 'admin'))
);

-- TABLE POLICIES (campaign_assets)
-- Add policy for Admins to INSERT records (was missing)
CREATE POLICY "Admins can insert assets"
ON campaign_assets FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Ensure Admins have full access if not already covered
DROP POLICY IF EXISTS "Admins can view all assets" ON campaign_assets;
CREATE POLICY "Admins can view all assets"
ON campaign_assets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update assets" ON campaign_assets;
CREATE POLICY "Admins can update assets"
ON campaign_assets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete assets" ON campaign_assets;
CREATE POLICY "Admins can delete assets"
ON campaign_assets FOR DELETE
USING (has_role(auth.uid(), 'admin'));
