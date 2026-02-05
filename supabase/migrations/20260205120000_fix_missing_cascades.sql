-- Fix missing ON DELETE CASCADE on various tables to ensure smooth deletions

-- 1. Fix films table (distributor_id)
ALTER TABLE public.films 
DROP CONSTRAINT IF EXISTS films_distributor_id_fkey,
ADD CONSTRAINT films_distributor_id_fkey 
  FOREIGN KEY (distributor_id) 
  REFERENCES public.distributors(id) 
  ON DELETE CASCADE;

-- 2. Fix campaigns table (distributor_id)
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_distributor_id_fkey,
ADD CONSTRAINT campaigns_distributor_id_fkey 
  FOREIGN KEY (distributor_id) 
  REFERENCES public.distributors(id) 
  ON DELETE CASCADE;

-- 3. Fix campaigns table (title_id)
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_title_id_fkey,
ADD CONSTRAINT campaigns_title_id_fkey 
  FOREIGN KEY (title_id) 
  REFERENCES public.titles(id) 
  ON DELETE CASCADE;

-- 4. Ensure access_logs is covered (already has it but just in case of different environments)
-- ALTER TABLE public.access_logs ... (Skipped as it was created recently with CASCADE)
