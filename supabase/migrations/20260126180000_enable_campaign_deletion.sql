-- Allow admins to delete campaigns
CREATE POLICY "Admins can delete campaigns"
ON public.campaigns
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
