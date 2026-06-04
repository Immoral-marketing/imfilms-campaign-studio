-- Allow authenticated users to create their own partner record (self-activation)
CREATE POLICY "partner_self_insert"
  ON public.partners
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
