-- FIX 1: Remove unused temp_password_hash column (security risk if ever used)
-- This column is currently NULL for all records and is not used by the application
ALTER TABLE public.members DROP COLUMN IF EXISTS temp_password_hash;

-- FIX 2: Restrict mailings visibility to admins only
-- Drop the overly permissive policy that allows all authenticated users to view mailings
DROP POLICY IF EXISTS "Authenticated users can view mailings" ON public.mailings;

-- FIX 3: Restrict mailing_templates visibility to admins only
-- Drop the overly permissive policy that allows all authenticated users to view templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.mailing_templates;

-- FIX 4: Restrict mailing_assets visibility to admins only
-- Drop the overly permissive policy that allows all authenticated users to view assets
DROP POLICY IF EXISTS "Authenticated users can view mailing assets" ON public.mailing_assets;

-- FIX 5: Create a view for companies without sensitive financial data
-- This allows regular members to see basic company info without bank/VAT details
CREATE OR REPLACE VIEW public.companies_public
WITH (security_invoker=on) AS
  SELECT 
    id, 
    name, 
    address, 
    postal_code, 
    city, 
    country, 
    website, 
    phone, 
    email,
    is_supplier,
    created_at, 
    updated_at
    -- Excluded: bank_account, vat_number, enterprise_number (sensitive financial data)
  FROM public.companies;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.companies_public TO authenticated;

-- Note: The members table already has proper RLS policies:
-- - "Admins can view all members" - admins can see everything
-- - "Members can only view their own record" - members see only their own data
-- - Anonymous/unauthenticated users cannot access any member data
-- This is the correct security model for a membership management system.