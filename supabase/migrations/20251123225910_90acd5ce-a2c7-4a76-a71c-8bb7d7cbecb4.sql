-- Create function to check if user is owner of a distributor
-- This breaks RLS recursion by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_distributor_owner(_user_id uuid, _distributor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.distributor_users
    WHERE user_id = _user_id
      AND distributor_id = _distributor_id
      AND is_owner = true
      AND is_active = true
  )
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Owners can manage team" ON public.distributor_users;

-- Create new policy using the SECURITY DEFINER function
CREATE POLICY "Owners can manage team"
ON public.distributor_users
FOR ALL
TO authenticated
USING (public.is_distributor_owner(auth.uid(), distributor_id))
WITH CHECK (public.is_distributor_owner(auth.uid(), distributor_id));

-- Also fix the campaigns policy that references distributor_users
DROP POLICY IF EXISTS "Distributors can view their campaigns" ON public.campaigns;

CREATE POLICY "Distributors can view their campaigns"
ON public.campaigns
FOR SELECT
TO authenticated
USING (
  public.is_distributor_owner(auth.uid(), distributor_id) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix the campaign update policy
DROP POLICY IF EXISTS "Distributors can update campaigns" ON public.campaigns;

CREATE POLICY "Distributors can update campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (public.is_distributor_owner(auth.uid(), distributor_id))
WITH CHECK (public.is_distributor_owner(auth.uid(), distributor_id));

-- Fix the campaign insert policy
DROP POLICY IF EXISTS "Distributors can insert campaigns" ON public.campaigns;

CREATE POLICY "Distributors can insert campaigns"
ON public.campaigns
FOR INSERT
TO authenticated
WITH CHECK (public.is_distributor_owner(auth.uid(), distributor_id));