-- Create media plan related tables

-- 1. Media Plan Phases
CREATE TABLE IF NOT EXISTS public.media_plan_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name text NOT NULL,
    start_date date,
    end_date date,
    objective text,
    kpis text,
    budget_percentage numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Media Plan Items (detailed plan)
CREATE TABLE IF NOT EXISTS public.media_plan_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    phase_id uuid REFERENCES public.media_plan_phases(id) ON DELETE CASCADE,
    support text,
    segmentation text,
    section text,
    format text,
    location text,
    start_date date,
    end_date date,
    investment numeric,
    soi_percentage numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Media Plan Audiences
CREATE TABLE IF NOT EXISTS public.media_plan_audiences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    name text NOT NULL,
    segmentation text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_plan_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_plan_audiences ENABLE ROW LEVEL SECURITY;

-- Policies for media_plan_phases
CREATE POLICY "Admins can manage media_plan_phases" ON public.media_plan_phases
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Distributors can view their campaign phases" ON public.media_plan_phases
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND distributor_id = auth.uid()));

-- Policies for media_plan_items
CREATE POLICY "Admins can manage media_plan_items" ON public.media_plan_items
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Distributors can view their campaign items" ON public.media_plan_items
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND distributor_id = auth.uid()));

-- Policies for media_plan_audiences
CREATE POLICY "Admins can manage media_plan_audiences" ON public.media_plan_audiences
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Distributors can view their campaign audiences" ON public.media_plan_audiences
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.campaigns WHERE id = campaign_id AND distributor_id = auth.uid()));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_updated_at_phases BEFORE UPDATE ON public.media_plan_phases FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_updated_at_items BEFORE UPDATE ON public.media_plan_items FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_updated_at_audiences BEFORE UPDATE ON public.media_plan_audiences FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
