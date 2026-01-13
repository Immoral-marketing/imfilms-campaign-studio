-- Fix films INSERT policy to allow new users to create films
-- This ensures the policy works for both the owner (direct ID match) and team members

-- Drop existing INSERT policies to be safe
DROP POLICY IF EXISTS "Distributors can insert their own films" ON public.films;
DROP POLICY IF EXISTS "Users can insert their own films" ON public.films;

-- Create the robust INSERT policy
CREATE POLICY "Distributors can insert their own films"
ON public.films
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is directly the distributor (legacy compatibility & new signups)
  auth.uid() = distributor_id
  OR
  -- Allow if user has permission via distributor_users (B2B model)
  distributor_id IN (
    SELECT distributor_id 
    FROM public.distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);
