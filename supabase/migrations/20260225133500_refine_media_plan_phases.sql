-- Migration to refine media_plan_phases schema
-- Changes objective and kpis from text to text[]

-- Convert objective to text[]
ALTER TABLE public.media_plan_phases 
ALTER COLUMN objective TYPE text[] 
USING CASE 
    WHEN objective IS NULL THEN '{}'::text[]
    WHEN objective = '' THEN '{}'::text[]
    ELSE ARRAY[objective]
END;

ALTER TABLE public.media_plan_phases 
ALTER COLUMN objective SET DEFAULT '{}';

-- Convert kpis to text[]
ALTER TABLE public.media_plan_phases 
ALTER COLUMN kpis TYPE text[] 
USING CASE 
    WHEN kpis IS NULL THEN '{}'::text[]
    WHEN kpis = '' THEN '{}'::text[]
    ELSE ARRAY[kpis]
END;

ALTER TABLE public.media_plan_phases 
ALTER COLUMN kpis SET DEFAULT '{}';
