-- Comprehensive fix for films RLS to resolve persistent insert errors
-- This migration drops ALL existing policies on the films table and rebuilds them from scratch
-- to ensure no conflicting or legacy policies are blocking legitimate inserts.

-- 1. Ensure RLS is enabled
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (using multiple names to catch variations)
DROP POLICY IF EXISTS "Distributors can insert their own films" ON public.films;
DROP POLICY IF EXISTS "Distributors can insert films" ON public.films;
DROP POLICY IF EXISTS "Users can insert their own films" ON public.films;
DROP POLICY IF EXISTS "Distributors can view their own films" ON public.films;
DROP POLICY IF EXISTS "Distributors can view their films" ON public.films;
DROP POLICY IF EXISTS "Distributors can view films" ON public.films;
DROP POLICY IF EXISTS "Users can view their own films" ON public.films;
DROP POLICY IF EXISTS "Users can update their own films" ON public.films;
DROP POLICY IF EXISTS "Distributors can update their own films" ON public.films;
DROP POLICY IF EXISTS "Distributors can update their films" ON public.films;
DROP POLICY IF EXISTS "Distributors can update films" ON public.films;
DROP POLICY IF EXISTS "Admins can view all films" ON public.films;

-- 3. Recreate clean, robust policies

-- INSERT: direct owner or team member with permission
CREATE POLICY "Distributors can insert films"
ON public.films
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

-- SELECT: direct owner or team member
CREATE POLICY "Distributors can view films"
ON public.films
FOR SELECT
TO authenticated
USING (
  auth.uid() = distributor_id
  OR
  distributor_id IN (
    SELECT distributor_id 
    FROM public.distributor_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

-- UPDATE: direct owner or team member with permission
CREATE POLICY "Distributors can update films"
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
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);

-- ADMIN: view all
-- Note: checks if has_role function exists to avoid errors, otherwise falls back to simple check
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') THEN
    EXECUTE 'CREATE POLICY "Admins can view all films" ON public.films FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))';
  ELSE
    -- Fallback/Placeholder if function missing (prevents crash, but effectively disables admin view via this policy)
    -- Admin access usually handled by service_role anyway, but keeping for completeness
    NULL;
  END IF;
END $$;
