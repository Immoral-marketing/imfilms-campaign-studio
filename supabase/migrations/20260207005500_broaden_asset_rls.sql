-- Broaden RLS policies for campaign_assets to allow any authorized distributor member to manage them
-- This covers the case where one team member uploads but another needs to delete/rename.

-- 1. Redefine DELETE policy
DROP POLICY IF EXISTS "Distributors can delete their own uploaded assets" ON campaign_assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON campaign_assets;

CREATE POLICY "Manage campaign assets deletion"
ON campaign_assets FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = uploaded_by OR
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN distributor_users du ON c.distributor_id = du.distributor_id
    WHERE c.id = campaign_assets.campaign_id
    AND du.user_id = auth.uid()
    AND du.can_manage_campaigns = true
    AND du.is_active = true
  )
);

-- 2. Redefine UPDATE policy (for renaming)
DROP POLICY IF EXISTS "Distributors can update their own uploaded assets" ON campaign_assets;
DROP POLICY IF EXISTS "Admins can update assets" ON campaign_assets;

CREATE POLICY "Manage campaign assets updates"
ON campaign_assets FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = uploaded_by OR
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN distributor_users du ON c.distributor_id = du.distributor_id
    WHERE c.id = campaign_assets.campaign_id
    AND du.user_id = auth.uid()
    AND du.can_manage_campaigns = true
    AND du.is_active = true
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  auth.uid() = uploaded_by OR
  EXISTS (
    SELECT 1 FROM campaigns c
    JOIN distributor_users du ON c.distributor_id = du.distributor_id
    WHERE c.id = campaign_assets.campaign_id
    AND du.user_id = auth.uid()
    AND du.can_manage_campaigns = true
    AND du.is_active = true
  )
);
