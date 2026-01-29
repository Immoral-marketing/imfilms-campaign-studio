-- Add name column to campaign_assets
ALTER TABLE campaign_assets
ADD COLUMN IF NOT EXISTS name text;
