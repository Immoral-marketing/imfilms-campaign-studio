CREATE OR REPLACE FUNCTION public.handle_new_distributor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_distributor_id uuid;
BEGIN
  INSERT INTO public.distributors (
    id,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    is_active
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'company_name', ''),
    COALESCE(new.raw_user_meta_data->>'contact_name', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'contact_phone', ''),
    true
  )
  RETURNING id INTO new_distributor_id;

  INSERT INTO public.distributor_users (
    distributor_id,
    user_id,
    role,
    is_owner,
    can_receive_reports,
    can_manage_campaigns,
    can_manage_billing,
    is_active
  )
  VALUES (
    new_distributor_id,
    new.id,
    'owner',
    true,
    true,
    true,
    true,
    true
  );

  RETURN new;
END;
$function$;
