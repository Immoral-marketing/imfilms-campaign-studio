
-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Site settings are viewable by everyone" 
ON public.site_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Only admins can update site settings" 
ON public.site_settings FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- Seed initial Calendly URL
INSERT INTO public.site_settings (key, value)
VALUES ('calendly_url', 'https://calendly.com/d/cmvg-s3x-wqy/haz-que-tu-marca-crezca-de-verdad?hide_event_type_details=1&hide_gdpr_banner=1')
ON CONFLICT (key) DO NOTHING;
