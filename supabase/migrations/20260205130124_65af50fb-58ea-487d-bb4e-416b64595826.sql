-- Drop and recreate the companies_public view without email and phone
-- This view is meant to expose only non-sensitive company information

DROP VIEW IF EXISTS public.companies_public;

CREATE VIEW public.companies_public AS
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

-- Add a comment explaining the purpose
COMMENT ON VIEW public.companies_public IS 'Public view of companies excluding sensitive fields (bank_account, vat_number, enterprise_number, email, phone)';