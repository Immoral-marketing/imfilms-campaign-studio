-- ============================================================================
-- MIGRACIÓN: Sistema de Chat para Campañas
-- Fecha: 2026-01-29
-- Descripción: Crea tabla campaign_messages y sus políticas RLS
-- ============================================================================

-- 1. CREAR TABLA campaign_messages
CREATE TABLE IF NOT EXISTS campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'distributor')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz
);

-- 2. CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign 
  ON campaign_messages(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_messages_created_at 
  ON campaign_messages(created_at);

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS

-- A. DISTRIBUIDORAS
-- Pueden ver y enviar mensajes en sus campañas si tienen permiso activo

CREATE POLICY "Distributors can view messages"
  ON campaign_messages
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id
      FROM campaigns c
      JOIN films f ON c.film_id = f.id
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.is_active = true
    )
  );

CREATE POLICY "Distributors can send messages"
  ON campaign_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verificar que la campaña pertenece a la distribuidora del usuario
    campaign_id IN (
      SELECT c.id
      FROM campaigns c
      JOIN films f ON c.film_id = f.id
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.is_active = true
    )
    -- Verificar que el sender es el usuario actual
    AND sender_id = auth.uid()
    -- Verificar rol correcto
    AND sender_role = 'distributor'
  );

-- B. ADMINS
-- Pueden ver y enviar mensajes en cualquier campaña

CREATE POLICY "Admins can view all messages"
  ON campaign_messages
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can send messages"
  ON campaign_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND sender_id = auth.uid()
    AND sender_role = 'admin'
  );

-- 5. COMENTARIOS
COMMENT ON TABLE campaign_messages IS 'Almacena el historial de chat de las campañas';
COMMENT ON COLUMN campaign_messages.sender_role IS 'Rol del remitente en el momento del envío: admin o distributor';
