-- ============================================================================
-- MIGRACIÓN: Añadir nombre de remitente al chat
-- Fecha: 2026-01-30
-- Descripción: Añade columna sender_name a campaign_messages para mostrar nombres reales
-- ============================================================================

-- 1. AÑADIR COLUMNA
ALTER TABLE campaign_messages 
ADD COLUMN IF NOT EXISTS sender_name text;

-- 2. COMENTARIOS
COMMENT ON COLUMN campaign_messages.sender_name IS 'Nombre del remitente (snapshot al momento de envío) para mostrar en el chat';
