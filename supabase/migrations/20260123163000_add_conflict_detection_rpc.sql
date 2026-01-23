-- Create a secure function to check for conflicts across ALL campaigns (bypassing RLS)
-- This is necessary because RLS prevents users from seeing other users' campaigns, 
-- but we need to know if there are conflicts (dates, genre, etc.) without exposing sensitive data.

CREATE OR REPLACE FUNCTION public.get_active_campaigns_for_conflicts(
  check_start_date date,
  check_end_date date,
  exclude_campaign_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
)
RETURNS TABLE (
  campaign_id uuid,
  premiere_start date,
  premiere_end date,
  territory text,
  film_title text,
  film_genre text,
  target_audience text
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (admin), bypassing RLS
SET search_path = public -- Secure search path
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as campaign_id,
    c.premiere_weekend_start,
    c.premiere_weekend_end,
    c.territory,
    f.title as film_title,
    f.genre as film_genre,
    f.target_audience_text as target_audience
  FROM campaigns c
  JOIN films f ON c.film_id = f.id
  WHERE 
    c.status IN ('nuevo', 'revisando', 'en_revision', 'aprobado', 'borrador')
    AND c.id != exclude_campaign_id
    -- Optimization: Only return campaigns that might overlap
    -- We look for campaigns starting within +/- 30 days of the check window to be safe
    -- (The frontend logic checks +/- 14 days, so grabbing a bit more context is fine)
    AND c.premiere_weekend_start >= (check_start_date - interval '30 days')
    AND c.premiere_weekend_start <= (check_end_date + interval '30 days');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_campaigns_for_conflicts(date, date, uuid) TO authenticated;
