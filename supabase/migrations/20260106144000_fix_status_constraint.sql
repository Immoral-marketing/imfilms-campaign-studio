-- Update campaigns status check constraint to include 'en_revision' and 'borrador'
-- This fixes the issue where the frontend uses different status values than the database

DO $$
BEGIN
  -- Drop the existing constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaigns_status_check') THEN
    ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_status_check;
  END IF;

  -- Add the new constraint with expanded values
  ALTER TABLE public.campaigns 
    ADD CONSTRAINT campaigns_status_check 
    CHECK (status IN ('nuevo', 'revisando', 'en_revision', 'aprobado', 'rechazado', 'borrador'));

  -- Optional: Migrate existing 'revisando' to 'en_revision' if we want to standardize on one
  -- UPDATE public.campaigns SET status = 'en_revision' WHERE status = 'revisando';
END $$;
