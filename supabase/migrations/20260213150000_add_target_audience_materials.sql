-- Add target_audience_urls and target_audience_files columns to films table
ALTER TABLE films
ADD COLUMN IF NOT EXISTS target_audience_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience_files text[] DEFAULT '{}';

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-materials', 'campaign-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Update the apply_approved_film_edit function to handle these new fields
CREATE OR REPLACE FUNCTION apply_approved_film_edit()
RETURNS TRIGGER AS $$
DECLARE
  proposal_data jsonb;
  target_film_id uuid;
  camp_id uuid;
BEGIN
  -- Only proceed if status is 'approved'
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  proposal_data := NEW.proposed_data;
  target_film_id := NEW.film_id;
  camp_id := NEW.campaign_id;

  -- Update films table
  UPDATE films
  SET
    title = COALESCE((proposal_data->>'title'), title),
    country = COALESCE((proposal_data->>'country'), country),
    genre = COALESCE((proposal_data->>'genre'), genre),
    secondary_genre = COALESCE((proposal_data->>'secondary_genre'), secondary_genre),
    target_audience_text = COALESCE((proposal_data->>'target_audience_text'), target_audience_text),
    target_audience_urls = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(proposal_data->'target_audience_urls') t(x)),
      target_audience_urls
    ),
    target_audience_files = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(proposal_data->'target_audience_files') t(x)),
      target_audience_files
    ),
    main_goals = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(proposal_data->'main_goals') t(x)),
      main_goals
    )
  WHERE id = target_film_id;

  -- Update campaigns table (Budget & Fees)
  -- Check if any campaign data is present in the proposal
  IF (proposal_data ? 'ad_investment_amount') THEN
      UPDATE campaigns
      SET
          ad_investment_amount = COALESCE((proposal_data->>'ad_investment_amount')::numeric, ad_investment_amount),
          -- Update fee columns if they exist in the proposal
          fixed_fee_amount = COALESCE((proposal_data->>'fixed_fee_amount')::numeric, fixed_fee_amount),
          variable_fee_amount = COALESCE((proposal_data->>'variable_fee_amount')::numeric, variable_fee_amount),
          setup_fee_amount = COALESCE((proposal_data->>'setup_fee_amount')::numeric, setup_fee_amount),
          total_estimated_amount = COALESCE((proposal_data->>'total_estimated_amount')::numeric, total_estimated_amount)
      WHERE id = camp_id;
  END IF;

  -- Manage platforms (campaign_platforms table)
  -- If 'platforms' key exists in proposal, we replace the existing platforms
  IF (proposal_data ? 'platforms') THEN
    -- 1. Delete existing platforms for this campaign
    DELETE FROM campaign_platforms WHERE campaign_id = camp_id;

    -- 2. Insert new platforms
    INSERT INTO campaign_platforms (campaign_id, platform_name, budget_percent)
    SELECT
      camp_id,
      p->>'platform_name',
      (p->>'budget_percent')::numeric
    FROM jsonb_array_elements(proposal_data->'platforms') AS p;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
