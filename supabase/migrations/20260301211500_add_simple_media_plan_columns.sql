-- Add simplified media plan columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS media_plan_simple_status text DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS media_plan_simple_url text,
ADD COLUMN IF NOT EXISTS media_plan_simple_feedback text;

-- Add constraint for media_plan_simple_status
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_media_plan_simple_status_check;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_media_plan_simple_status_check 
CHECK (media_plan_simple_status IN ('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado'));
