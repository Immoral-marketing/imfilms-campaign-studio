-- Add report workflow columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS report_status text DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS report_url text,
ADD COLUMN IF NOT EXISTS report_feedback text;

-- Add constraint for report_status
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_report_status_check;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_report_status_check 
CHECK (report_status IN ('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado'));
