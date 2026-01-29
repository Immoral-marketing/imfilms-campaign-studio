-- Safe migration to ensure table and column exist

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.campaign_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  platform_name text NOT NULL
);

-- 2. Add budget_percent column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'campaign_platforms'
        AND column_name = 'budget_percent'
    ) THEN
        ALTER TABLE public.campaign_platforms 
        ADD COLUMN budget_percent numeric(5,2) DEFAULT NULL;
    END IF;
END $$;

-- 3. Update comment
COMMENT ON COLUMN public.campaign_platforms.budget_percent IS 'Percentage of the budget allocated to this platform';

-- 4. Enable RLS if not already enabled (idempotent)
ALTER TABLE public.campaign_platforms ENABLE ROW LEVEL SECURITY;

-- 5. Re-apply policies (drop first to avoid errors)
DROP POLICY IF EXISTS "Users can view their campaign platforms" ON public.campaign_platforms;
CREATE POLICY "Users can view their campaign platforms"
  ON public.campaign_platforms FOR SELECT
  USING (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_platforms.campaign_id
  ));

DROP POLICY IF EXISTS "Users can insert their campaign platforms" ON public.campaign_platforms;
CREATE POLICY "Users can insert their campaign platforms"
  ON public.campaign_platforms FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT f.user_id FROM public.films f
    JOIN public.campaigns c ON c.film_id = f.id
    WHERE c.id = campaign_platforms.campaign_id
  ));
