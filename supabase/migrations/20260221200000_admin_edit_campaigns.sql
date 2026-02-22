-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Admins can update all films" ON public.films;
DROP POLICY IF EXISTS "Admins can view all films" ON public.films;
DROP POLICY IF EXISTS "Admins can manage all campaign platforms" ON public.campaign_platforms;
DROP POLICY IF EXISTS "Admins can manage all campaign addons" ON public.campaign_addons;

-- Grant admins UPDATE permission on films table
CREATE POLICY "Admins can update all films"
ON public.films
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Grant admins SELECT on all films
CREATE POLICY "Admins can view all films"
ON public.films
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Grant admins full access to campaign_platforms
CREATE POLICY "Admins can manage all campaign platforms"
ON public.campaign_platforms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Grant admins full access to campaign_addons
CREATE POLICY "Admins can manage all campaign addons"
ON public.campaign_addons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
