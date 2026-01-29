-- ============================================================================
-- MIGRACIÓN: Sistema de propuestas de edición para películas
-- Fecha: 2026-01-28
-- ============================================================================

-- 1. CREAR TABLA film_edit_proposals
-- Almacena propuestas de cambio a la información de películas
-- Flujo: Distribuidora propone → Admin aprueba/rechaza → Se aplican cambios

CREATE TABLE IF NOT EXISTS film_edit_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  film_id uuid NOT NULL REFERENCES films(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Datos propuestos (JSONB para flexibilidad futura)
  -- Campos esperados: title, country, genre, target_audience_text, main_goals
  proposed_data jsonb NOT NULL,
  
  -- Estado del flujo de revisión
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Auditoría: quién propuso
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  
  -- Auditoría: quién revisó
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_comment text,
  
  -- Constraint: solo una propuesta pendiente por película
  -- Esto previene conflictos y fuerza a resolver propuestas antes de crear nuevas
  CONSTRAINT unique_pending_proposal_per_film
    EXCLUDE (film_id WITH =) 
    WHERE (status = 'pending')
);

-- 2. CREAR ÍNDICES
-- Optimizan consultas frecuentes

CREATE INDEX IF NOT EXISTS idx_film_edit_proposals_film 
  ON film_edit_proposals(film_id);

CREATE INDEX IF NOT EXISTS idx_film_edit_proposals_campaign 
  ON film_edit_proposals(campaign_id);

CREATE INDEX IF NOT EXISTS idx_film_edit_proposals_status 
  ON film_edit_proposals(status);

CREATE INDEX IF NOT EXISTS idx_film_edit_proposals_created_by 
  ON film_edit_proposals(created_by);

CREATE INDEX IF NOT EXISTS idx_film_edit_proposals_pending 
  ON film_edit_proposals(film_id, status) 
  WHERE status = 'pending';

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE film_edit_proposals ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS - DISTRIBUIDORAS

-- Distribuidoras pueden CREAR propuestas para películas de sus distribuidoras
-- Solo si tienen permiso can_manage_campaigns
CREATE POLICY "Distributors can create edit proposals"
  ON film_edit_proposals 
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verificar que el film pertenece a la distribuidora del usuario
    film_id IN (
      SELECT f.id 
      FROM films f
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.can_manage_campaigns = true
        AND du.is_active = true
    )
    -- Verificar que el usuario es quien crea la propuesta
    AND created_by = auth.uid()
    -- Solo permitir creación con status pending
    AND status = 'pending'
  );

-- Distribuidoras pueden VER propuestas de sus propias películas
CREATE POLICY "Distributors can view their proposals"
  ON film_edit_proposals 
  FOR SELECT
  TO authenticated
  USING (
    film_id IN (
      SELECT f.id 
      FROM films f
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.is_active = true
    )
  );

-- 5. POLÍTICAS RLS - ADMINS

-- Admins pueden VER todas las propuestas
CREATE POLICY "Admins can view all proposals"
  ON film_edit_proposals 
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins pueden ACTUALIZAR propuestas (aprobar/rechazar)
CREATE POLICY "Admins can update proposal status"
  ON film_edit_proposals 
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    -- Verificar que quien revisa es admin
    has_role(auth.uid(), 'admin'::app_role)
    -- El admin debe ser quien firma la revisión
    AND reviewed_by = auth.uid()
    -- Solo permitir cambios a approved o rejected
    AND status IN ('approved', 'rejected')
  );

-- 6. FUNCIÓN HELPER: Aplicar cambios aprobados
-- Se ejecuta después de aprobar una propuesta
-- Actualiza la tabla films con los datos propuestos

CREATE OR REPLACE FUNCTION apply_approved_film_edit(proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal film_edit_proposals%ROWTYPE;
  v_proposed_data jsonb;
BEGIN
  -- Obtener la propuesta
  SELECT * INTO v_proposal
  FROM film_edit_proposals
  WHERE id = proposal_id
    AND status = 'approved';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found or not approved';
  END IF;
  
  v_proposed_data := v_proposal.proposed_data;
  
  -- Aplicar cambios a la tabla films
  UPDATE films
  SET
    title = COALESCE(v_proposed_data->>'title', title),
    country = COALESCE(v_proposed_data->>'country', country),
    genre = COALESCE(v_proposed_data->>'genre', genre),
    target_audience_text = COALESCE(v_proposed_data->>'target_audience_text', target_audience_text),
    main_goals = COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_proposed_data->'main_goals')),
      main_goals
    )
  WHERE id = v_proposal.film_id;
  
  -- Log para auditoría
  RAISE NOTICE 'Applied approved film edit proposal % to film %', proposal_id, v_proposal.film_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_approved_film_edit(uuid) TO authenticated;

-- 7. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON TABLE film_edit_proposals IS 'Propuestas de edición de información de películas. Flujo: Distribuidora propone → Admin revisa → Se aplica si aprueba.';
COMMENT ON COLUMN film_edit_proposals.proposed_data IS 'JSON con campos editables: title, country, genre, target_audience_text, main_goals';
COMMENT ON COLUMN film_edit_proposals.status IS 'Estado: pending (en revisión), approved (aprobado y aplicado), rejected (rechazado)';
COMMENT ON FUNCTION apply_approved_film_edit IS 'Aplica los cambios de una propuesta aprobada a la tabla films';
