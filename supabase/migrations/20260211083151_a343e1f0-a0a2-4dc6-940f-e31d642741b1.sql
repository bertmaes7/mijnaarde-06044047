-- Recreate companies_public view with security_invoker=on
DROP VIEW IF EXISTS public.companies_public;

CREATE VIEW public.companies_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    address,
    postal_code,
    city,
    country,
    website,
    is_supplier,
    created_at,
    updated_at
  FROM public.companies;