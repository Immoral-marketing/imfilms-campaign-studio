-- Add original_filename column to campaign_assets if it doesn't exist
ALTER TABLE campaign_assets
ADD COLUMN IF NOT EXISTS original_filename text;
