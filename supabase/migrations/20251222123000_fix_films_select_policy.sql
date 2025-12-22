-- Fix films SELECT policy to work with distributor_users

-- Drop old policy that relies on user_id
DROP POLICY IF EXISTS "Users can view their own films" ON public.films;

-- Create new policy based on distributor_id
CREATE POLICY "Distributors can view their films"
  ON public.films
  FOR SELECT
  TO authenticated
  USING (
    -- Legacy/Owner direct check
    auth.uid() = distributor_id
    OR
    -- Check via distributor_users
    distributor_id IN (
      SELECT distributor_id 
      FROM public.distributor_users 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Also ensure UPDATE policies are correct (optional but good practice)
DROP POLICY IF EXISTS "Users can update their own films" ON public.films;

CREATE POLICY "Distributors can update their films"
  ON public.films
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = distributor_id
    OR
    distributor_id IN (
      SELECT distributor_id 
      FROM public.distributor_users 
      WHERE user_id = auth.uid() 
      AND can_manage_campaigns = true -- Assuming update requires manage permission
      AND is_active = true
    )
  );
