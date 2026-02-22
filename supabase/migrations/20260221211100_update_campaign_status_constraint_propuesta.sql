-- Migration to update campaign status check constraint
-- Allows adding the new 'propuesta_lista' status

ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE public.campaigns
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN (
  'nuevo', -- Keep for legacy/backward compatibility if needed
  'borrador', 
  'en_revision', 
  'revisando', -- Keep for legacy
  'propuesta_lista', -- New Status for when a proposal is ready for the distributor
  'pendiente_creativos', -- Keep for legacy
  'aprobada', 
  'aprobado', -- Keep for legacy
  'creativos_en_revision', 
  'activa', 
  'finalizada', 
  'rechazada', 
  'pausada'
));
