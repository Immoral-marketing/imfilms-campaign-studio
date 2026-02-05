-- Add column to track the last time an email notification was sent for a chat message
-- This allows us to implement the 30-minute cooldown logic
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS last_chat_notification_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.last_chat_notification_at IS 'Timestamp of the last chat email notification sent to avoid spam (cooldown)';
