-- Create profiles table for additional user data
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  phone text,
  is_first_release boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create films table
CREATE TABLE public.films (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  genre text NOT NULL,
  country text NOT NULL,
  distributor_name text NOT NULL,
  copies_estimate text,
  target_audience_text text,
  main_goals text[] DEFAULT '{}',
  release_date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on films
ALTER TABLE public.films ENABLE ROW LEVEL SECURITY;

-- Films policies
CREATE POLICY "Users can view their own films"
  ON public.films FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own films"
  ON public.films FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own films"
  ON public.films FOR UPDATE
  USING (auth.uid() = user_id);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id uuid REFERENCES public.films(id) ON DELETE CASCADE NOT NULL,
  pre_start_date date NOT NULL,
  pre_end_date date NOT NULL,
  premiere_weekend_start date NOT NULL,
  premiere_weekend_end date NOT NULL,
  final_report_date date NOT NULL,
  creatives_deadline date NOT NULL,
  ad_investment_amount numeric(10,2) NOT NULL,
  fixed_fee_amount numeric(10,2) NOT NULL,
  variable_fee_amount numeric(10,2) NOT NULL,
  setup_fee_amount numeric(10,2) NOT NULL,
  addons_base_amount numeric(10,2) DEFAULT 0,
  total_estimated_amount numeric(10,2) NOT NULL,
  is_first_release boolean NOT NULL,
  status text DEFAULT 'nuevo' CHECK (status IN ('nuevo', 'revisando', 'aprobado', 'rechazado')),
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  additional_comments text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Campaigns policies - users can only see their own
CREATE POLICY "Users can view their own campaigns"
  ON public.campaigns FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.films WHERE id = campaigns.film_id));

CREATE POLICY "Users can insert their own campaigns"
  ON public.campaigns FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.films WHERE id = campaigns.film_id));

-- Create campaign_platforms table
CREATE TABLE public.campaign_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  platform_name text NOT NULL
);

-- Enable RLS on campaign_platforms
ALTER TABLE public.campaign_platforms ENABLE ROW LEVEL SECURITY;

-- Campaign platforms policies
CREATE POLICY "Users can view their campaign platforms"
  ON public.campaign_platforms FOR SELECT
  USING (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_platforms.campaign_id
  ));

CREATE POLICY "Users can insert their campaign platforms"
  ON public.campaign_platforms FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_platforms.campaign_id
  ));

-- Create campaign_addons table
CREATE TABLE public.campaign_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  addon_type text NOT NULL CHECK (addon_type IN ('adaptacion', 'microsite', 'email_whatsapp')),
  notes text
);

-- Enable RLS on campaign_addons
ALTER TABLE public.campaign_addons ENABLE ROW LEVEL SECURITY;

-- Campaign addons policies
CREATE POLICY "Users can view their campaign addons"
  ON public.campaign_addons FOR SELECT
  USING (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_addons.campaign_id
  ));

CREATE POLICY "Users can insert their campaign addons"
  ON public.campaign_addons FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_addons.campaign_id
  ));

-- Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, company_name, contact_name, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'company_name', ''),
    COALESCE(new.raw_user_meta_data->>'contact_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', '')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create admin role for internal panel
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  hashed_password text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can read admin_users (we'll handle auth separately in edge function)
CREATE POLICY "Service role can manage admin users"
  ON public.admin_users FOR ALL
  USING (auth.role() = 'service_role');

-- Insert default admin user (password: imfilms3ADMK!)
-- Using bcrypt hash for the password
INSERT INTO public.admin_users (username, hashed_password)
VALUES ('teamfilms', '$2a$10$vGq7xQYlKh5c8UzJDqXlq.HFx6TpXVtKZPFLGcV5YZw8kLlqJjK5m');

-- Policies for admin to view all campaigns
CREATE POLICY "Admins can view all campaigns"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
  );

CREATE POLICY "Admins can update campaign status"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM public.admin_users)
  );