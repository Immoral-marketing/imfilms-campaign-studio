-- ============================================================================
-- MIGRACIÓN: Actualización de función apply_approved_film_edit
-- Fecha: 2026-01-29
-- Descripción: Añade soporte para actualizar secondary_genre y distribution de plataformas
-- ============================================================================

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
  
  -- 1. Aplicar cambios a la tabla films
  UPDATE films
  SET
    title = COALESCE(v_proposed_data->>'title', title),
    country = COALESCE(v_proposed_data->>'country', country),
    genre = COALESCE(v_proposed_data->>'genre', genre),
    -- Manejo de secondary_genre:
    -- Si viene en el JSON (incluso vacío), actualizamos. Si no viene (null), mantenemos old.
    -- Nota: COALESCE(op1, op2) devuelve op2 si op1 es NULL.
    -- v_proposed_data->>'secondary_genre' devuelve NULL si la clave no existe o es JSON null.
    -- Pero si enviamos "", devuelve "".
    -- Queremos que si no existe la clave, NO toque el valor.
    -- Si existe y es "", ponga "".
    secondary_genre = CASE 
      WHEN v_proposed_data ? 'secondary_genre' THEN v_proposed_data->>'secondary_genre'
      ELSE secondary_genre
    END,
    target_audience_text = COALESCE(v_proposed_data->>'target_audience_text', target_audience_text),
    main_goals = COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_proposed_data->'main_goals')),
      main_goals
    )
  WHERE id = v_proposal.film_id;

  -- 2. Aplicar cambios a platforms (si existen en la propuesta)
  -- Usamos 'platforms' como clave del array de objetos {platform_name, budget_percent}
  IF v_proposed_data ? 'platforms' THEN
    -- Eliminamos las plataformas existentes para esta campaña para reescribirlas
    -- Esto maneja actualizaciones y eliminaciones limpiamente
    DELETE FROM campaign_platforms WHERE campaign_id = v_proposal.campaign_id;
    
    -- Insertamos las nuevas
    INSERT INTO campaign_platforms (campaign_id, platform_name, budget_percent)
    SELECT 
      v_proposal.campaign_id,
      p->>'platform_name',
      (p->>'budget_percent')::numeric
    FROM jsonb_array_elements(v_proposed_data->'platforms') AS p;
  END IF;
  
  -- Log para auditoría
  RAISE NOTICE 'Applied approved film edit proposal % to film % (inc. platforms)', proposal_id, v_proposal.film_id;
END;
$$;
