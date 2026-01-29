-- Add budget_percent column to campaign_platforms table
ALTER TABLE public.campaign_platforms 
ADD COLUMN budget_percent numeric(5,2) DEFAULT NULL;

-- Comment on column
COMMENT ON COLUMN public.campaign_platforms.budget_percent IS 'Percentage of the budget allocated to this platform';
