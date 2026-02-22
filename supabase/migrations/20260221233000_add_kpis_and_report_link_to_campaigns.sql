-- Add KPI and Report Link columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN reach bigint,
ADD COLUMN clicks integer,
ADD COLUMN visits integer,
ADD COLUMN ctr numeric(5,2),
ADD COLUMN cpm numeric(10,2),
ADD COLUMN report_link text;

-- Ensure admins can update these new columns
DROP POLICY IF EXISTS "Admins can update all campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can update campaign status" ON public.campaigns;

CREATE POLICY "Admins can update all campaigns"
ON public.campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
