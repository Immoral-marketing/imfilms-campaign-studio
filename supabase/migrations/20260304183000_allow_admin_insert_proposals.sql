-- Migration: Allow admins to insert film edit proposals
-- This enables direct application of changes by admins without a pending review state

CREATE POLICY "Admins can insert edit proposals"
  ON public.film_edit_proposals 
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND created_by = auth.uid()
  );
