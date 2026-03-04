-- Create fee_thresholds table
CREATE TABLE IF NOT EXISTS public.fee_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_investment NUMERIC NOT NULL,
    max_investment NUMERIC,
    variable_fee_rate NUMERIC NOT NULL DEFAULT 0,
    fixed_fee_amount NUMERIC NOT NULL DEFAULT 0,
    setup_fee_per_platform NUMERIC NOT NULL DEFAULT 200,
    is_variable_fee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_fixed_fee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_setup_fee_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fee_thresholds ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read (authenticated users)
CREATE POLICY "Allow authenticated users to view fee thresholds"
    ON public.fee_thresholds
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can modify
CREATE POLICY "Allow admins full access to fee thresholds"
    ON public.fee_thresholds
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fee_thresholds_updated_at
    BEFORE UPDATE ON public.fee_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed initial data (based on current rules)
INSERT INTO public.fee_thresholds 
(min_investment, max_investment, variable_fee_rate, fixed_fee_amount, setup_fee_per_platform, is_variable_fee_enabled, is_fixed_fee_enabled, is_setup_fee_enabled)
VALUES 
(0, 3000, 0, 500, 200, false, true, true),
(3001, 8000, 0.20, 0, 200, true, false, true),
(8001, 15000, 0.15, 0, 200, true, false, true),
(15001, 30000, 0.12, 0, 200, true, false, true),
(30001, NULL, 0.08, 0, 200, true, false, true);
