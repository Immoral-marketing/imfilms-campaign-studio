-- Fix access control: Backfill distributor_users and update triggers

-- 1. Update the trigger function to create distributor_users record automatically for new users
CREATE OR REPLACE FUNCTION public.handle_new_distributor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_distributor_id uuid;
BEGIN
  -- Insert into distributors (as before)
  INSERT INTO public.distributors (
    id, 
    company_name, 
    contact_name, 
    contact_email, 
    contact_phone
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'company_name', ''),
    COALESCE(new.raw_user_meta_data->>'contact_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'contact_phone', '')
  )
  RETURNING id INTO new_distributor_id;

  -- NEW: Insert into distributor_users to give the user admin access to their own distributor
  INSERT INTO public.distributor_users (
    distributor_id,
    user_id,
    role,
    is_owner,
    can_receive_reports,
    can_manage_campaigns,
    can_manage_billing,
    is_active
  )
  VALUES (
    new_distributor_id,
    new.id,
    'owner',
    true,
    true,
    true,
    true,
    true
  );

  RETURN new;
END;
$$;

-- 2. Backfill missing distributor_users for existing distributors
-- This essentially "repairs" the current user's permissions
INSERT INTO public.distributor_users (
  distributor_id,
  user_id,
  role,
  is_owner,
  can_receive_reports,
  can_manage_campaigns,
  can_manage_billing,
  is_active
)
SELECT 
  id, -- acts as distributor_id (since they are 1:1 on creation)
  id, -- acts as user_id
  'owner',
  true,
  true,
  true,
  true,
  true
FROM public.distributors d
WHERE NOT EXISTS (
  SELECT 1 FROM public.distributor_users du WHERE du.distributor_id = d.id AND du.user_id = d.id
)
ON CONFLICT (distributor_id, user_id) DO NOTHING;

-- 3. Ensure Policy for inserting films is robust
DROP POLICY IF EXISTS "Distributors can insert their own films" ON public.films;

CREATE POLICY "Distributors can insert their own films"
  ON public.films
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is directly the distributor (legacy compatibility)
    auth.uid() = distributor_id
    OR
    -- OR if user has permission via distributor_users (new model)
    distributor_id IN (
      SELECT distributor_id 
      FROM public.distributor_users 
      WHERE user_id = auth.uid() 
      AND can_manage_campaigns = true 
      AND is_active = true
    )
  );

-- 4. Ensure Policy for inserting campaigns is robust
DROP POLICY IF EXISTS "Distributors can insert their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Distributors can insert campaigns" ON public.campaigns;

CREATE POLICY "Distributors can insert campaigns"
  ON public.campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = distributor_id
    OR
    distributor_id IN (
        SELECT distributor_id
        FROM public.distributor_users
        WHERE user_id = auth.uid()
        AND can_manage_campaigns = true
        AND is_active = true
    )
  );
