-- Add column to track the last time an email notification was sent for CREATIVE uploads
-- This allows us to implement the 15-minute cooldown logic
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS last_creative_notification_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.last_creative_notification_at IS 'Timestamp of the last creative upload email notification sent to avoid spam (cooldown)';
