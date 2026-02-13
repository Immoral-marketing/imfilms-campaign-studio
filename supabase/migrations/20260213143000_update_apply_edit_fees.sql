-- Update apply_approved_film_edit logic to handle campaign budget AND FEES
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
  
  -- 1. Aplicar cambios a la tabla FILMS (Info básica)
  UPDATE films
  SET
    title = COALESCE(v_proposed_data->>'title', title),
    country = COALESCE(v_proposed_data->>'country', country),
    genre = COALESCE(v_proposed_data->>'genre', genre),
    secondary_genre = COALESCE(v_proposed_data->>'secondary_genre', secondary_genre),
    target_audience_text = COALESCE(v_proposed_data->>'target_audience_text', target_audience_text),
    main_goals = COALESCE(
      (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_proposed_data->'main_goals')),
      main_goals
    )
  WHERE id = v_proposal.film_id;

  -- 2. Aplicar cambios a la tabla CAMPAIGNS (Presupuesto y Fees)
  -- Solo actualizamos si se envió 'ad_investment_amount', asumimos que los fees van juntos
  IF v_proposed_data ? 'ad_investment_amount' THEN
    UPDATE campaigns
    SET
      ad_investment_amount = (v_proposed_data->>'ad_investment_amount')::numeric,
      fixed_fee_amount = COALESCE((v_proposed_data->>'fixed_fee_amount')::numeric, fixed_fee_amount),
      variable_fee_amount = COALESCE((v_proposed_data->>'variable_fee_amount')::numeric, variable_fee_amount),
      setup_fee_amount = COALESCE((v_proposed_data->>'setup_fee_amount')::numeric, setup_fee_amount),
      total_estimated_amount = COALESCE((v_proposed_data->>'total_estimated_amount')::numeric, total_estimated_amount),
      updated_at = now()
    WHERE id = v_proposal.campaign_id;
  END IF;

  -- 3. Aplicar cambios a CAMPAIGN_PLATFORMS
  IF v_proposed_data ? 'platforms' AND jsonb_array_length(v_proposed_data->'platforms') > 0 THEN
    -- A. Eliminar plataformas existentes para esta campaña
    DELETE FROM campaign_platforms
    WHERE campaign_id = v_proposal.campaign_id;

    -- B. Insertar nuevas plataformas
    FOR v_platform IN SELECT * FROM jsonb_array_elements(v_proposed_data->'platforms')
    LOOP
      INSERT INTO campaign_platforms (campaign_id, platform_name, budget_percent)
      VALUES (
        v_proposal.campaign_id,
        v_platform->>'platform_name',
        (v_platform->>'budget_percent')::numeric
      );
    END LOOP;
  END IF;
  
  -- Log para auditoría
  RAISE NOTICE 'Applied approved film edit proposal % to film % and campaign %', proposal_id, v_proposal.film_id, v_proposal.campaign_id;
END;
$$;
