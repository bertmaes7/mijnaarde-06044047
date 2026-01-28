-- Fix companies table: restrict access to admins and members linked to that company
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;

-- Create a function to check if a member is linked to a company
CREATE OR REPLACE FUNCTION public.is_linked_to_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE auth_user_id = auth.uid()
      AND company_id = _company_id
  )
$$;

-- New policy: Only admins and members linked to the company can view it
CREATE POLICY "Members can view their linked company"
ON public.companies
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR is_linked_to_company(id)
);

-- Fix members table: ensure the SELECT policy is strictly secure
-- The current policy is actually correct, but let's make it explicit with separate policies
DROP POLICY IF EXISTS "Members can view their own record" ON public.members;

-- Recreate with clearer naming and same logic
CREATE POLICY "Members can only view their own record"
ON public.members
FOR SELECT
USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all members"
ON public.members
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));