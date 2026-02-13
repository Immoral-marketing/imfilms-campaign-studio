-- =============================================================
-- Campaign Notifications table for in-app notification system
-- =============================================================

CREATE TABLE IF NOT EXISTS public.campaign_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type text NOT NULL,            -- 'creative_upload', future: 'status_change', etc.
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',   -- extra data: file_count, uploader_name, file_names, etc.
  created_at timestamptz DEFAULT now(),
  read_at timestamptz DEFAULT NULL
);

-- Index for fast lookups by campaign
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_campaign_id 
  ON public.campaign_notifications(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_notifications_created_at 
  ON public.campaign_notifications(created_at DESC);

-- RLS
ALTER TABLE public.campaign_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can see all notifications
CREATE POLICY "Admins can view all notifications"
  ON public.campaign_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Campaign owners (distributors) can see notifications for their campaigns
CREATE POLICY "Campaign owners can view their notifications"
  ON public.campaign_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE id = campaign_notifications.campaign_id 
      AND user_id = auth.uid()
    )
  );

-- Service role can insert (Edge Functions)
CREATE POLICY "Service role can insert notifications"
  ON public.campaign_notifications FOR INSERT
  WITH CHECK (true);

-- Authenticated users can update read_at (mark as read)
CREATE POLICY "Authenticated users can mark as read"
  ON public.campaign_notifications FOR UPDATE
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.campaign_notifications IS 'In-app notifications for campaigns (creatives upload, status changes, etc.)';

-- =============================================================
-- Cooldown column for creative upload email notifications
-- =============================================================

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS last_creative_notification_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.last_creative_notification_at 
IS 'Timestamp of last creative upload email notification (15-min cooldown)';
