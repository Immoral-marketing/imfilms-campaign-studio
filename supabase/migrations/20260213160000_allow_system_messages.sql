-- =============================================================
-- Allow system messages in campaign_messages
-- The Edge Function needs to insert messages with sender_role = 'system'
-- and without a sender_id (since it's an automated system message)
-- =============================================================

-- 1. Make sender_id nullable for system messages
ALTER TABLE public.campaign_messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- 2. Update the CHECK constraint to allow 'system' role
ALTER TABLE public.campaign_messages 
DROP CONSTRAINT IF EXISTS campaign_messages_sender_role_check;

ALTER TABLE public.campaign_messages 
ADD CONSTRAINT campaign_messages_sender_role_check 
CHECK (sender_role IN ('admin', 'distributor', 'system'));

-- 3. Allow service role to insert system messages (RLS bypass not needed for service_role,
--    but adding an explicit policy for safety)
CREATE POLICY "Allow system message inserts"
  ON public.campaign_messages
  FOR INSERT
  WITH CHECK (true);
