-- Add admin policy for distributor_users
-- This allows admins to find the user_id associated with a distributor

CREATE POLICY "Admins can view all distributor associations"
ON public.distributor_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also allow admins to manage the associations if needed (e.g. cleanup)
CREATE POLICY "Admins can manage all distributor associations"
ON public.distributor_users
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
