-- Allow distributors to delete their own uploaded assets
DROP POLICY IF EXISTS "Distributors can delete their own uploaded assets" ON campaign_assets;
CREATE POLICY "Distributors can delete their own uploaded assets"
ON campaign_assets FOR DELETE
USING (auth.uid() = uploaded_by);

-- Allow distributors to rename their own uploaded assets
DROP POLICY IF EXISTS "Distributors can update their own uploaded assets" ON campaign_assets;
CREATE POLICY "Distributors can update their own uploaded assets"
ON campaign_assets FOR UPDATE
USING (auth.uid() = uploaded_by);
