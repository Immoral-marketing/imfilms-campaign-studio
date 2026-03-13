-- ============================================================================
-- MIGRACIÓN: Soporte para editar fecha de estreno y calendario de campaña
-- Fecha: 2026-03-13
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
  v_platform jsonb;
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
  
  -- 1. Aplicar cambios a la tabla FILMS
  UPDATE films
  SET
    title = COALESCE(v_proposed_data->>'title', title),
    country = COALESCE(v_proposed_data->>'country', country),
    genre = COALESCE(v_proposed_data->>'genre', genre),
    secondary_genre = COALESCE(v_proposed_data->>'secondary_genre', secondary_genre),
    target_audience_text = COALESCE(v_proposed_data->>'target_audience_text', target_audience_text),
    target_audience_urls = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(v_proposed_data->'target_audience_urls') t(x)),
      target_audience_urls
    ),
    target_audience_files = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(v_proposed_data->'target_audience_files') t(x)),
      target_audience_files
    ),
    main_goals = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(v_proposed_data->'main_goals') t(x)),
      main_goals
    ),
    release_date = COALESCE((v_proposed_data->>'release_date')::date, release_date)
  WHERE id = v_proposal.film_id;

  -- 2. Aplicar cambios a la tabla CAMPAIGNS (Presupuesto, Fees y FECHAS)
  UPDATE campaigns
  SET
    -- Presupuesto y Fees (solo si están en la propuesta)
    ad_investment_amount = COALESCE((v_proposed_data->>'ad_investment_amount')::numeric, ad_investment_amount),
    fixed_fee_amount = COALESCE((v_proposed_data->>'fixed_fee_amount')::numeric, fixed_fee_amount),
    variable_fee_amount = COALESCE((v_proposed_data->>'variable_fee_amount')::numeric, variable_fee_amount),
    setup_fee_amount = COALESCE((v_proposed_data->>'setup_fee_amount')::numeric, setup_fee_amount),
    total_estimated_amount = COALESCE((v_proposed_data->>'total_estimated_amount')::numeric, total_estimated_amount),
    
    -- Fechas de la campaña (recalculadas en el frontend)
    pre_start_date = COALESCE((v_proposed_data->>'pre_start_date')::date, pre_start_date),
    pre_end_date = COALESCE((v_proposed_data->>'pre_end_date')::date, pre_end_date),
    premiere_weekend_start = COALESCE((v_proposed_data->>'premiere_weekend_start')::date, premiere_weekend_start),
    premiere_weekend_end = COALESCE((v_proposed_data->>'premiere_weekend_end')::date, premiere_weekend_end),
    final_report_date = COALESCE((v_proposed_data->>'final_report_date')::date, final_report_date),
    creatives_deadline = COALESCE((v_proposed_data->>'creatives_deadline')::date, creatives_deadline),
    
    updated_at = now()
  WHERE id = v_proposal.campaign_id;

  -- 3. Aplicar cambios a CAMPAIGN_PLATFORMS
  IF v_proposed_data ? 'platforms' AND jsonb_array_length(v_proposed_data->'platforms') > 0 THEN
    -- A. Eliminar plataformas existentes para esta campaña
    DELETE FROM campaign_platforms
    WHERE campaign_id = v_proposal.campaign_id;

    -- B. Insertar nuevas plataformas
    INSERT INTO campaign_platforms (campaign_id, platform_name, budget_percent)
    SELECT
      v_proposal.campaign_id,
      p->>'platform_name',
      (p->>'budget_percent')::numeric
    FROM jsonb_array_elements(v_proposed_data->'platforms') AS p;
  END IF;
  
  -- Log para auditoría
  RAISE NOTICE 'Applied approved film edit proposal % to film % and campaign %', proposal_id, v_proposal.film_id, v_proposal.campaign_id;
END;
$$;
