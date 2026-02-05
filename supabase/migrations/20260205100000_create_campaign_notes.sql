-- Create campaign_notes table for internal admin comments
CREATE TABLE IF NOT EXISTS public.campaign_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_done boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_notes_campaign_id ON public.campaign_notes(campaign_id);

-- RLS
ALTER TABLE public.campaign_notes ENABLE ROW LEVEL SECURITY;

-- Policies (Admin only for everything)
CREATE POLICY "Admins can view all campaign notes"
  ON public.campaign_notes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert campaign notes"
  ON public.campaign_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update campaign notes"
  ON public.campaign_notes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete campaign notes"
  ON public.campaign_notes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.campaign_notes IS 'Internal notes for campaigns, accessible only by administrators';
