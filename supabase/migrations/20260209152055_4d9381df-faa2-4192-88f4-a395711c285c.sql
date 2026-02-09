CREATE POLICY "Public can read logo assets"
ON public.mailing_assets
FOR SELECT
USING (type = 'logo');