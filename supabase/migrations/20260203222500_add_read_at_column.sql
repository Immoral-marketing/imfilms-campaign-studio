-- Add read_at column if it doesn't exist
ALTER TABLE campaign_messages 
ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Add index for performance check on unread messages
CREATE INDEX IF NOT EXISTS idx_campaign_messages_read_at 
ON campaign_messages(read_at);
