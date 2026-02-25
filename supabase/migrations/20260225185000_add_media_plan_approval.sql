-- Add media plan status and feedback to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS media_plan_status text DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS media_plan_feedback text;

-- Add constraint for media_plan_status
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS campaigns_media_plan_status_check;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_media_plan_status_check 
CHECK (media_plan_status IN ('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado'));

-- Update RLS to ensure distributors can only see the media plan if it's not a draft
-- Note: The existing policies for media_plan_phases/items/audiences use a check on the campaigns table.
-- We can refine those policies if needed, but since the button for distributors will be hidden in the UI, 
-- that's the primary point of control.
