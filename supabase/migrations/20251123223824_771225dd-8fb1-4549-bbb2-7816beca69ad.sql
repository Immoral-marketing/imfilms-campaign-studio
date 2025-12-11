-- Corregir search_path en funciones para seguridad

-- Función normalize_company_name con search_path explícito
CREATE OR REPLACE FUNCTION normalize_company_name(name text)
RETURNS text 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN lower(trim(regexp_replace(
    translate(name, 
      'áéíóúàèìòùäëïöüâêîôûãõñçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑÇ',
      'aeiouaeiouaeiouaeiouaoncAEIOUAEIOUAEIOUAEIOUAONC'
    ),
    '\s+', ' ', 'g'
  )));
END;
$$;

-- Función update_distributor_normalized_name con search_path explícito
CREATE OR REPLACE FUNCTION update_distributor_normalized_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.normalized_name := normalize_company_name(NEW.company_name);
  RETURN NEW;
END;
$$;