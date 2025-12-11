-- 1. Create distributors table (replaces profiles)
CREATE TABLE public.distributors (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on distributors
ALTER TABLE public.distributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for distributors
CREATE POLICY "Distributors can view their own profile"
  ON public.distributors
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Distributors can update their own profile"
  ON public.distributors
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Distributors can insert their own profile"
  ON public.distributors
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all distributors"
  ON public.distributors
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update distributors"
  ON public.distributors
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert distributors"
  ON public.distributors
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Drop ALL existing RLS policies that depend on user_id
-- Films policies
DROP POLICY IF EXISTS "Users can insert their own films" ON public.films;
DROP POLICY IF EXISTS "Users can update their own films" ON public.films;
DROP POLICY IF EXISTS "Users can view their own films" ON public.films;

-- Campaign policies
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;

-- Campaign platforms policies
DROP POLICY IF EXISTS "Users can view their campaign platforms" ON public.campaign_platforms;
DROP POLICY IF EXISTS "Users can insert their campaign platforms" ON public.campaign_platforms;

-- Campaign addons policies
DROP POLICY IF EXISTS "Users can view their campaign addons" ON public.campaign_addons;
DROP POLICY IF EXISTS "Users can insert their campaign addons" ON public.campaign_addons;

-- 3. Add distributor_id to films table and migrate data
ALTER TABLE public.films ADD COLUMN distributor_id uuid REFERENCES public.distributors(id);

-- Migrate existing data: copy user_id to distributor_id
UPDATE public.films SET distributor_id = user_id;

-- Make distributor_id required after migration
ALTER TABLE public.films ALTER COLUMN distributor_id SET NOT NULL;

-- Now we can safely drop the user_id column
ALTER TABLE public.films DROP COLUMN user_id;

-- New RLS Policies for films
CREATE POLICY "Distributors can view their own films"
  ON public.films
  FOR SELECT
  USING (auth.uid() = distributor_id);

CREATE POLICY "Distributors can insert their own films"
  ON public.films
  FOR INSERT
  WITH CHECK (auth.uid() = distributor_id);

CREATE POLICY "Distributors can update their own films"
  ON public.films
  FOR UPDATE
  USING (auth.uid() = distributor_id);

CREATE POLICY "Admins can view all films"
  ON public.films
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add distributor_id to campaigns
ALTER TABLE public.campaigns ADD COLUMN distributor_id uuid REFERENCES public.distributors(id);

-- Migrate existing data: get distributor_id from films
UPDATE public.campaigns 
SET distributor_id = films.distributor_id 
FROM public.films 
WHERE campaigns.film_id = films.id;

-- Make distributor_id required
ALTER TABLE public.campaigns ALTER COLUMN distributor_id SET NOT NULL;

-- New RLS Policies for campaigns
CREATE POLICY "Distributors can view their own campaigns"
  ON public.campaigns
  FOR SELECT
  USING (auth.uid() = distributor_id);

CREATE POLICY "Distributors can insert their own campaigns"
  ON public.campaigns
  FOR INSERT
  WITH CHECK (auth.uid() = distributor_id);

CREATE POLICY "Distributors can update their own campaigns"
  ON public.campaigns
  FOR UPDATE
  USING (auth.uid() = distributor_id);

-- Keep admin policies (already exist from previous migrations)

-- 5. Update campaign_platforms RLS policies
CREATE POLICY "Distributors can view their campaign platforms"
  ON public.campaign_platforms
  FOR SELECT
  USING (auth.uid() IN (
    SELECT distributor_id 
    FROM public.campaigns 
    WHERE id = campaign_platforms.campaign_id
  ));

CREATE POLICY "Distributors can insert their campaign platforms"
  ON public.campaign_platforms
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT distributor_id 
    FROM public.campaigns 
    WHERE id = campaign_platforms.campaign_id
  ));

CREATE POLICY "Admins can view all campaign platforms"
  ON public.campaign_platforms
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Update campaign_addons RLS policies
CREATE POLICY "Distributors can view their campaign addons"
  ON public.campaign_addons
  FOR SELECT
  USING (auth.uid() IN (
    SELECT distributor_id 
    FROM public.campaigns 
    WHERE id = campaign_addons.campaign_id
  ));

CREATE POLICY "Distributors can insert their campaign addons"
  ON public.campaign_addons
  FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT distributor_id 
    FROM public.campaigns 
    WHERE id = campaign_addons.campaign_id
  ));

CREATE POLICY "Admins can view all campaign addons"
  ON public.campaign_addons
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Update trigger for new users to create distributor profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_distributor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
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
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_distributor();

-- 8. Create updated_at trigger for distributors
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_distributors_updated_at
  BEFORE UPDATE ON public.distributors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Drop old profiles table (after data migration)
DROP TABLE IF EXISTS public.profiles CASCADE;