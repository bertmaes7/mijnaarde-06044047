-- =====================================================
-- SECURITY FIX: Restrict mailing tables to authenticated users
-- =====================================================

-- Drop public read policies on mailing tables
DROP POLICY IF EXISTS "Allow public read on mailing_assets" ON public.mailing_assets;
DROP POLICY IF EXISTS "Allow public read on mailing_templates" ON public.mailing_templates;
DROP POLICY IF EXISTS "Allow public read on mailings" ON public.mailings;

-- Create authenticated-only read policies
CREATE POLICY "Authenticated users can view mailing assets"
  ON public.mailing_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view templates"
  ON public.mailing_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view mailings"
  ON public.mailings FOR SELECT
  TO authenticated
  USING (true);